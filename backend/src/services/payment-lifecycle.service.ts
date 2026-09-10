import { createHash, randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import type {
  PaymentObservationSource,
  PaymentObservedState,
  Prisma,
  RefundReason,
} from '../generated/prisma/client.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';
import { releaseOrderReservations } from './inventory.service.js';
import { emailService } from './email.service.js';

export type PaymentObservation = {
  source: PaymentObservationSource;
  state: PaymentObservedState;
  deduplicationKey: string;
  amountPaise?: number;
  merchantId?: string;
  providerReference?: string;
  responseCode?: string;
};

function boundedKey(value: string): string {
  return value.length <= 128
    ? value
    : `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

export async function requestRefund(
  tx: Prisma.TransactionClient,
  input: {
    paymentId: string;
    returnId?: string;
    amountPaise: number;
    reason: RefundReason;
    idempotencyKey: string;
  },
) {
  const idempotencyKey = boundedKey(input.idempotencyKey);
  const existing = await tx.paymentRefund.findUnique({ where: { idempotencyKey } });
  if (existing) {
    if (existing.paymentId !== input.paymentId || existing.amountPaise !== input.amountPaise) {
      throw new ConflictError('Refund idempotency key was reused with different details.', 'REFUND_IDEMPOTENCY_MISMATCH');
    }
    return existing;
  }

  await tx.$queryRaw`SELECT id FROM "payments" WHERE id = ${input.paymentId}::uuid FOR UPDATE`;
  const lockedExisting = await tx.paymentRefund.findUnique({ where: { idempotencyKey } });
  if (lockedExisting) {
    if (lockedExisting.paymentId !== input.paymentId || lockedExisting.amountPaise !== input.amountPaise) {
      throw new ConflictError('Refund idempotency key was reused with different details.', 'REFUND_IDEMPOTENCY_MISMATCH');
    }
    return lockedExisting;
  }
  const payment = await tx.payment.findUnique({ where: { id: input.paymentId } });
  if (!payment) throw new NotFoundError('Payment was not found.', 'PAYMENT_NOT_FOUND');
  if (!['SUCCESS', 'PAID'].includes(payment.status)) {
    throw new ConflictError('Only captured payments can be refunded.', 'PAYMENT_NOT_REFUNDABLE');
  }
  if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise <= 0) {
    throw new ConflictError('Refund amount must be a positive integer number of paise.', 'INVALID_REFUND_AMOUNT');
  }

  const totals = await tx.paymentRefund.aggregate({
    where: { paymentId: payment.id, status: { in: ['REQUESTED', 'PENDING', 'SUCCEEDED'] } },
    _sum: { amountPaise: true },
  });
  if ((totals._sum.amountPaise ?? 0) + input.amountPaise > payment.amountPaise) {
    throw new ConflictError('Refund total cannot exceed the captured payment.', 'REFUND_AMOUNT_EXCEEDED');
  }

  const id = randomUUID();
  const demo = env.PAYMENT_PROVIDER === 'demo';
  const refund = await tx.paymentRefund.create({
    data: {
      id,
      paymentId: payment.id,
      returnId: input.returnId,
      amountPaise: input.amountPaise,
      reason: input.reason,
      mode: demo ? 'DEMO' : 'LIVE',
      status: demo ? 'SUCCEEDED' : 'REQUESTED',
      idempotencyKey,
      attemptCount: demo ? 1 : 0,
      providerReference: demo ? `demo_refund_${id}` : null,
      processedAt: demo ? new Date() : null,
    },
  });

  if (demo) {
    const succeeded = await tx.paymentRefund.aggregate({
      where: { paymentId: payment.id, status: 'SUCCEEDED' },
      _sum: { amountPaise: true },
    });
    if ((succeeded._sum.amountPaise ?? 0) === payment.amountPaise) {
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
      const otherCaptured = await tx.payment.count({
        where: { orderId: payment.orderId, id: { not: payment.id }, status: { in: ['SUCCESS', 'PAID'] } },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: otherCaptured > 0 ? 'SUCCESS' : 'REFUNDED' },
      });
    }
  }
  return refund;
}

export async function applyPaymentObservation(
  tx: Prisma.TransactionClient,
  paymentId: string,
  observation: PaymentObservation,
) {
  const deduplicationKey = boundedKey(observation.deduplicationKey);
  await tx.$queryRaw`SELECT id FROM "payments" WHERE id = ${paymentId}::uuid FOR UPDATE`;
  const payment = await tx.payment.findUnique({
    where: { id: paymentId },
    include: { order: { include: { user: true } } },
  });
  if (!payment) throw new NotFoundError('Payment was not found.', 'PAYMENT_NOT_FOUND');

  const existing = await tx.paymentObservation.findUnique({ where: { deduplicationKey } });
  if (existing) return { payment, disposition: 'DUPLICATE' as const, changed: false };
  if (observation.state === 'SUCCESS') {
    if (typeof observation.amountPaise !== 'number' || !Number.isInteger(observation.amountPaise) || observation.amountPaise !== payment.amountPaise) {
      throw new ConflictError('Provider amount must be specified and must match the authoritative payment amount.', 'PAYMENT_AMOUNT_MISMATCH');
    }
  } else if (observation.amountPaise !== undefined && observation.amountPaise !== payment.amountPaise) {
    throw new ConflictError('Provider amount does not match the payment amount.', 'PAYMENT_AMOUNT_MISMATCH');
  }


  let disposition: 'APPLIED' | 'DUPLICATE' | 'IGNORED' | 'LATE_CAPTURE' = 'APPLIED';
  let details = 'Provider observation applied.';
  let changed = false;

  if (observation.state === 'PENDING') {
    disposition = 'IGNORED';
    details = 'Pending observation recorded without changing financial state.';
  } else if (observation.state === 'SUCCESS') {
    if (payment.status === 'REFUNDED') {
      disposition = 'IGNORED';
      details = 'Captured observation cannot reverse a completed full refund.';
    } else if (['SUCCESS', 'PAID'].includes(payment.status)) {
      disposition = 'DUPLICATE';
      details = 'Payment was already captured; fulfillment state was preserved.';
    } else {
      const lateCapture = ['FAILED', 'EXPIRED', 'CANCELLED'].includes(payment.status) || payment.order.status === 'CANCELLED';
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCESS', providerReference: observation.providerReference ?? payment.providerReference },
      });
      await tx.paymentInitiation.updateMany({
        where: { paymentId: payment.id },
        data: { state: 'SUCCEEDED', leaseToken: null, leaseExpiresAt: null, lastErrorCode: null, lastErrorAt: null },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: 'SUCCESS',
          ...(payment.order.status === 'PENDING' ? { status: 'CONFIRMED' as const } : {}),
        },
      });
      await tx.inventoryReservation.updateMany({
        where: { orderId: payment.orderId, status: 'ACTIVE' },
        data: { status: 'CONSUMED' },
      });
      changed = true;
      if (lateCapture) {
        disposition = 'LATE_CAPTURE';
        details = 'Late capture recorded after inventory release; a full refund was requested.';
        await requestRefund(tx, {
          paymentId: payment.id,
          amountPaise: payment.amountPaise,
          reason: 'LATE_CAPTURE',
          idempotencyKey: `late-capture:${payment.id}`,
        });
      } else {
        const purchased = await tx.orderItem.findMany({ where: { orderId: payment.orderId } });
        const cart = await tx.cart.findUnique({ where: { userId: payment.order.userId } });
        if (cart) {
          for (const line of purchased) {
            if (!line.variantId) continue;
            // Atomically delete cart items where remaining quantity is exhausted
            const deleted = await tx.cartItem.deleteMany({
              where: { cartId: cart.id, variantId: line.variantId, quantity: { lte: line.quantity } },
            });
            // If items remain beyond purchased quantity, atomically decrement the difference
            if (deleted.count === 0) {
              await tx.cartItem.updateMany({
                where: { cartId: cart.id, variantId: line.variantId, quantity: { gt: line.quantity } },
                data: { quantity: { decrement: line.quantity } },
              });
            }
          }
        }
        if (payment.order.user?.email && payment.order.status === 'PENDING') {
          void emailService.sendOrderConfirmation(payment.order.user.email, {
            id: payment.orderId,
            orderNumber: payment.order.orderNumber,
            totalAmountPaise: payment.amountPaise,
          }).catch(() => {});
        }
      }

    }
  } else if (['SUCCESS', 'PAID', 'REFUNDED'].includes(payment.status)) {
    disposition = 'IGNORED';
    details = 'A non-capture observation cannot regress captured or refunded money.';
  } else if (payment.status === observation.state) {
    disposition = 'DUPLICATE';
    details = 'Payment already has the observed terminal state.';
  } else if (['PENDING', 'INITIATED'].includes(payment.status)) {
    await tx.payment.update({ where: { id: payment.id }, data: { status: observation.state } });
    await tx.paymentInitiation.updateMany({
      where: { paymentId: payment.id },
      data: {
        state: 'FAILED', leaseToken: null, leaseExpiresAt: null,
        lastErrorCode: `PAYMENT_${observation.state}`, lastErrorAt: new Date(),
      },
    });
    await releaseOrderReservations(
      tx,
      payment.orderId,
      observation.state === 'EXPIRED' ? 'EXPIRED' : 'RELEASED',
      observation.state === 'EXPIRED' ? 'RESTOCK' : 'CANCELLATION',
      `Payment ${observation.state.toLowerCase()} reservation release`,
    );
    await tx.couponRedemption.deleteMany({ where: { orderId: payment.orderId } });
    if (payment.order.status === 'PENDING') {
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: 'CANCELLED', paymentStatus: observation.state },
      });
    }
    changed = true;
  } else {
    disposition = 'IGNORED';
    details = 'Observation was not valid for the current monotonic state.';
  }

  await tx.paymentObservation.create({
    data: {
      paymentId: payment.id,
      source: observation.source,
      observedState: observation.state,
      disposition,
      deduplicationKey,
      amountPaise: observation.amountPaise,
      merchantId: observation.merchantId,
      providerReference: observation.providerReference,
      responseCode: observation.responseCode,
      details,
    },
  });
  const current = await tx.payment.findUniqueOrThrow({ where: { id: payment.id }, include: { order: true } });
  return { payment: current, disposition, changed };
}
