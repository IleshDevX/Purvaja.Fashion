import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPrismaClient } from '../../src/config/database.js';
import { CommerceService } from '../../src/services/commerce.service.js';
import {
  ProviderInitiationError,
  type PaymentProviderAdapter,
} from '../../src/services/payment-provider.service.js';

const prisma = getPrismaClient();
let userId = '';

async function createPendingPayment() {
  const order = await prisma.order.create({
    data: {
      orderNumber: `PHASE4-${randomUUID()}`,
      userId,
      shippingAddress: { recipientName: 'Phase Four Buyer' },
      subtotalPaise: 10000,
      shippingChargePaise: 19900,
      totalPaise: 29900,
    },
  });
  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: 'PHONEPE',
      method: 'UPI',
      amountPaise: 29900,
      idempotencyKey: randomUUID(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      initiation: { create: {} },
    },
  });
  return { order, payment };
}

function successfulProvider(callCounter: { count: number }, delayMs = 0): PaymentProviderAdapter {
  return {
    async initiate(input) {
      callCounter.count += 1;
      if (delayMs) await new Promise(resolve => setTimeout(resolve, delayMs));
      return {
        providerReference: `provider-${input.paymentId}`,
        redirectUrl: `https://gateway.example/pay/${input.paymentId}`,
      };
    },
  };
}

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      email: `phase4-${randomUUID()}@example.invalid`,
      passwordHash: 'not-an-authentication-fixture',
      emailVerifiedAt: new Date(),
    },
  });
  userId = user.id;
});

afterAll(async () => {
  if (!userId) return;
  await prisma.payment.deleteMany({ where: { order: { userId } } });
  await prisma.order.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
});

describe('Phase 4 durable provider initiation', () => {
  it('allows one provider call when two service processes initiate the same payment concurrently', async () => {
    const { payment } = await createPendingPayment();
    const calls = { count: 0 };
    const provider = successfulProvider(calls, 50);
    const firstProcess = new CommerceService(undefined, () => provider);
    const secondProcess = new CommerceService(undefined, () => provider);

    const sessions = await Promise.all([
      firstProcess.initiate(userId, payment.id),
      secondProcess.initiate(userId, payment.id),
    ]);

    expect(calls.count).toBe(1);
    expect(sessions.map(session => session.paymentId)).toEqual([payment.id, payment.id]);
    expect(sessions.every(session => Boolean(session.redirectUrl))).toBe(true);
    expect(await prisma.paymentInitiation.findUnique({ where: { paymentId: payment.id } }))
      .toMatchObject({ state: 'SUCCEEDED', attemptCount: 1 });
  });

  it('persists and reuses the provider redirect response after a process restart', async () => {
    const { payment } = await createPendingPayment();
    const calls = { count: 0 };
    const provider = successfulProvider(calls);
    const first = await new CommerceService(undefined, () => provider).initiate(userId, payment.id);
    const replay = await new CommerceService(undefined, () => provider).initiate(userId, payment.id);

    expect(calls.count).toBe(1);
    expect(replay.redirectUrl).toBe(first.redirectUrl);
    expect(replay.initiationStatus).toBe('SUCCEEDED');
  });

  it('records an unknown provider outcome and does not blindly call the provider again', async () => {
    const { payment } = await createPendingPayment();
    const calls = { count: 0 };
    const provider: PaymentProviderAdapter = {
      async initiate() {
        calls.count += 1;
        throw new ProviderInitiationError('Provider timed out.', 'PROVIDER_TIMEOUT', 'UNKNOWN', 504);
      },
    };
    await expect(new CommerceService(undefined, () => provider).initiate(userId, payment.id))
      .rejects.toMatchObject({ code: 'PROVIDER_TIMEOUT' });

    const replay = await new CommerceService(undefined, () => provider).initiate(userId, payment.id);
    expect(calls.count).toBe(1);
    expect(replay.initiationStatus).toBe('UNKNOWN');
    expect(replay.redirectUrl).toContain(`/checkout/payment-status?paymentId=${payment.id}`);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PENDING');
  });

  it('allows a new claimed attempt after a definite provider rejection', async () => {
    const { payment } = await createPendingPayment();
    const rejected: PaymentProviderAdapter = {
      async initiate() {
        throw new ProviderInitiationError('Request was rejected.', 'PROVIDER_REJECTED', 'DEFINITE_FAILURE');
      },
    };
    await expect(new CommerceService(undefined, () => rejected).initiate(userId, payment.id))
      .rejects.toMatchObject({ code: 'PROVIDER_REJECTED' });

    const calls = { count: 0 };
    const recovered = await new CommerceService(undefined, () => successfulProvider(calls)).initiate(userId, payment.id);
    expect(calls.count).toBe(1);
    expect(recovered.initiationStatus).toBe('SUCCEEDED');
    expect(await prisma.paymentInitiation.findUnique({ where: { paymentId: payment.id } }))
      .toMatchObject({ state: 'SUCCEEDED', attemptCount: 2 });
  });

  it('turns an expired owner lease into an unknown outcome without a duplicate call', async () => {
    const { payment } = await createPendingPayment();
    await prisma.paymentInitiation.update({
      where: { paymentId: payment.id },
      data: {
        state: 'LEASED',
        leaseToken: randomUUID(),
        leaseExpiresAt: new Date(Date.now() - 1000),
        attemptCount: 1,
      },
    });
    const calls = { count: 0 };
    const replay = await new CommerceService(undefined, () => successfulProvider(calls)).initiate(userId, payment.id);

    expect(calls.count).toBe(0);
    expect(replay.initiationStatus).toBe('UNKNOWN');
    expect(await prisma.paymentInitiation.findUnique({ where: { paymentId: payment.id } }))
      .toMatchObject({ state: 'UNKNOWN', leaseToken: null, leaseExpiresAt: null });
  });
});
