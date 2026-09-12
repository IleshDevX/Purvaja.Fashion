import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPrismaClient } from '../../src/config/database.js';
import { env } from '../../src/config/env.js';
import { CommerceService } from '../../src/services/commerce.service.js';
import { requestRefund } from '../../src/services/payment-lifecycle.service.js';
import { ProviderRefundError, type PaymentProviderAdapter } from '../../src/services/payment-provider.service.js';

const prisma = getPrismaClient();
let userId = '';

async function paymentFixture(status: 'PENDING' | 'SUCCESS' | 'EXPIRED' = 'PENDING', orderStatus: 'PENDING' | 'SHIPPED' | 'CANCELLED' = 'PENDING') {
  const order = await prisma.order.create({
    data: {
      orderNumber: `PHASE5-${randomUUID()}`,
      userId,
      shippingAddress: { recipientName: 'Phase Five Buyer' },
      subtotalPaise: 10000,
      totalPaise: 10000,
      status: orderStatus,
      paymentStatus: status,
    },
  });
  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: 'PHONEPE',
      method: 'UPI',
      amountPaise: 10000,
      status,
      idempotencyKey: randomUUID(),
    },
  });
  return { order, payment };
}

beforeAll(async () => {
  userId = (await prisma.user.create({
    data: { email: `phase5-${randomUUID()}@example.invalid`, passwordHash: 'not-used', emailVerifiedAt: new Date() },
  })).id;
});

afterAll(async () => {
  if (!userId) return;
  await prisma.paymentObservation.deleteMany({ where: { payment: { order: { userId } } } });
  await prisma.paymentRefund.deleteMany({ where: { payment: { order: { userId } } } });
  await prisma.payment.deleteMany({ where: { order: { userId } } });
  await prisma.order.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
});

describe('Phase 5 authoritative payment lifecycle', () => {
  it('accepts a duplicate success after shipment without regressing fulfillment', async () => {
    const { order, payment } = await paymentFixture('SUCCESS', 'SHIPPED');
    const result = await new CommerceService().complete(userId, payment.id, 'SUCCESS');

    expect(result.paymentStatus).toBe('SUCCESS');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('SHIPPED');
    expect(await prisma.paymentObservation.findFirst({ where: { paymentId: payment.id } }))
      .toMatchObject({ observedState: 'SUCCESS', disposition: 'DUPLICATE' });
  });

  it('ignores an out-of-order failure after capture', async () => {
    const { order, payment } = await paymentFixture('SUCCESS', 'SHIPPED');
    await new CommerceService().complete(userId, payment.id, 'FAILED');

    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('SUCCESS');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('SHIPPED');
    expect(await prisma.paymentObservation.findFirst({ where: { paymentId: payment.id } }))
      .toMatchObject({ observedState: 'FAILED', disposition: 'IGNORED' });
  });

  it('records a late capture and creates one idempotent demo refund', async () => {
    const { order, payment } = await paymentFixture('EXPIRED', 'CANCELLED');
    const service = new CommerceService();
    await service.complete(userId, payment.id, 'SUCCESS');
    await service.complete(userId, payment.id, 'SUCCESS');

    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('CANCELLED');
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('REFUNDED');
    expect(await prisma.paymentRefund.count({ where: { paymentId: payment.id } })).toBe(1);
    expect(await prisma.paymentRefund.findFirst({ where: { paymentId: payment.id } }))
      .toMatchObject({ amountPaise: 10000, status: 'SUCCEEDED', mode: 'DEMO', reason: 'LATE_CAPTURE' });
  });

  it('supports concurrent partial refund idempotency and marks only a fully refunded payment REFUNDED', async () => {
    const { payment } = await paymentFixture('SUCCESS', 'SHIPPED');
    const firstKey = `partial:${randomUUID()}`;
    const firstPair = await Promise.all([
      prisma.$transaction(tx => requestRefund(tx, { paymentId: payment.id, amountPaise: 4000, reason: 'RETURN', idempotencyKey: firstKey })),
      prisma.$transaction(tx => requestRefund(tx, { paymentId: payment.id, amountPaise: 4000, reason: 'RETURN', idempotencyKey: firstKey })),
    ]);
    expect(firstPair[0].id).toBe(firstPair[1].id);
    expect(await prisma.paymentRefund.count({ where: { paymentId: payment.id } })).toBe(1);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('SUCCESS');

    await prisma.$transaction(tx => requestRefund(tx, {
      paymentId: payment.id,
      amountPaise: 6000,
      reason: 'RETURN',
      idempotencyKey: `remainder:${randomUUID()}`,
    }));
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('REFUNDED');
  });

  it('keeps live refunds requested until provider money movement is verified', async () => {
    const { payment } = await paymentFixture('SUCCESS', 'SHIPPED');
    const original = env.PAYMENT_PROVIDER;
    (env as { PAYMENT_PROVIDER: 'demo' | 'phonepe' }).PAYMENT_PROVIDER = 'phonepe';
    try {
      const refund = await prisma.$transaction(tx => requestRefund(tx, {
        paymentId: payment.id,
        amountPaise: 10000,
        reason: 'ORDER_CANCELLED',
        idempotencyKey: `live:${randomUUID()}`,
      }));
      expect(refund).toMatchObject({ status: 'REQUESTED', mode: 'LIVE', attemptCount: 0, processedAt: null });
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('SUCCESS');
    } finally {
      (env as { PAYMENT_PROVIDER: 'demo' | 'phonepe' }).PAYMENT_PROVIDER = original;
    }
  });

  it('fetches reconciliation status before applying a fresh locked observation', async () => {
    const { payment } = await paymentFixture();
    let checks = 0;
    const provider: PaymentProviderAdapter = {
      refundMode: 'LIVE',
      async initiate() { throw new Error('not used'); },
      async checkStatus() {
        checks += 1;
        return { success: true, state: 'COMPLETED', amountPaise: 10000, providerReference: `capture-${payment.id}` };
      },
    };
    const result = await new CommerceService(undefined, () => provider).reconcilePayment(payment.id, 'operator');

    expect(checks).toBe(1);
    expect(result).toMatchObject({ previousStatus: 'PENDING', newStatus: 'SUCCESS', reconciled: true });
    expect(await prisma.paymentObservation.findFirst({ where: { paymentId: payment.id } }))
      .toMatchObject({ source: 'RECONCILIATION', observedState: 'SUCCESS', disposition: 'APPLIED' });
  });

  it('settles pending refunds only after exact-amount completion, without resubmitting money movement', async () => {
    const { payment } = await paymentFixture('SUCCESS', 'SHIPPED');
    const refund = await prisma.paymentRefund.create({ data: {
      paymentId: payment.id, amountPaise: payment.amountPaise, reason: 'ORDER_CANCELLED',
      mode: 'LIVE', status: 'REQUESTED', idempotencyKey: randomUUID(),
    } });
    let submissions = 0;
    let amount = payment.amountPaise - 1;
    const provider: PaymentProviderAdapter = {
      refundMode: 'LIVE',
      async initiate() { throw new Error('unused'); },
      async refund() {
        submissions++;
        return { providerReference: 'provider-refund', amountPaise: payment.amountPaise, state: 'PENDING' };
      },
      async checkRefundStatus() {
        return { providerReference: 'provider-refund', amountPaise: amount, state: 'COMPLETED' };
      },
    };
    await expect(new CommerceService().processRefund(refund.id)).rejects.toMatchObject({ code: 'REFUND_PROVIDER_MISMATCH' });
    const service = new CommerceService(undefined, () => provider);
    expect(await service.processRefund(refund.id)).toMatchObject({ status: 'PENDING', processedAt: null });
    expect(await service.processRefund(refund.id)).toMatchObject({ status: 'PENDING', failureCode: 'REFUND_AMOUNT_MISMATCH' });
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('SUCCESS');
    amount = payment.amountPaise;
    expect(await service.processRefund(refund.id)).toMatchObject({ status: 'SUCCEEDED' });
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('REFUNDED');
    expect(submissions).toBe(1);
  });

  it('retries a definite refund rejection but does not blindly retry an unknown outcome', async () => {
    const { payment } = await paymentFixture('SUCCESS', 'SHIPPED');
    const original = env.PAYMENT_PROVIDER;
    (env as { PAYMENT_PROVIDER: 'demo' | 'phonepe' }).PAYMENT_PROVIDER = 'phonepe';
    const refund = await prisma.$transaction(tx => requestRefund(tx, {
      paymentId: payment.id,
      amountPaise: 10000,
      reason: 'ORDER_CANCELLED',
      idempotencyKey: `retry:${randomUUID()}`,
    }));
    (env as { PAYMENT_PROVIDER: 'demo' | 'phonepe' }).PAYMENT_PROVIDER = original;

    let attempts = 0;
    const rejectedThenSuccessful: PaymentProviderAdapter = {
      refundMode: 'LIVE',
      async initiate() { throw new Error('not used'); },
      async refund() {
        attempts += 1;
        if (attempts === 1) throw new ProviderRefundError('Rejected.', 'REFUND_REJECTED', 'DEFINITE_FAILURE');
        return { providerReference: `refund-${refund.id}`, state: 'COMPLETED', amountPaise: refund.amountPaise };
      },
    };
    const service = new CommerceService(undefined, () => rejectedThenSuccessful);
    expect(await service.processRefund(refund.id)).toMatchObject({ status: 'FAILED', failureCode: 'REFUND_REJECTED' });
    expect(await service.processRefund(refund.id)).toMatchObject({ status: 'SUCCEEDED', attemptCount: 2 });
    expect(attempts).toBe(2);

    const { payment: unknownPayment } = await paymentFixture('SUCCESS', 'SHIPPED');
    (env as { PAYMENT_PROVIDER: 'demo' | 'phonepe' }).PAYMENT_PROVIDER = 'phonepe';
    const unknownRefund = await prisma.$transaction(tx => requestRefund(tx, {
      paymentId: unknownPayment.id,
      amountPaise: 10000,
      reason: 'ORDER_CANCELLED',
      idempotencyKey: `unknown:${randomUUID()}`,
    }));
    (env as { PAYMENT_PROVIDER: 'demo' | 'phonepe' }).PAYMENT_PROVIDER = original;
    let unknownAttempts = 0;
    const unknownProvider: PaymentProviderAdapter = {
      refundMode: 'LIVE',
      async initiate() { throw new Error('not used'); },
      async refund() {
        unknownAttempts += 1;
        throw new ProviderRefundError('Timed out.', 'REFUND_TIMEOUT', 'UNKNOWN', 504);
      },
    };
    const unknownService = new CommerceService(undefined, () => unknownProvider);
    expect(await unknownService.processRefund(unknownRefund.id)).toMatchObject({ status: 'PENDING', failureCode: 'REFUND_TIMEOUT' });
    expect(await unknownService.processRefund(unknownRefund.id)).toMatchObject({ status: 'PENDING' });
    expect(unknownAttempts).toBe(1);
  });
});
