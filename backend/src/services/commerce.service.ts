import { createHash, randomUUID } from 'node:crypto';
import { commercePolicy, isWithinReturnWindow } from '@purvaja/commerce-policy';
import { getPrismaClient } from '../config/database.js';
import { env } from '../config/env.js';
import { logger, logOperationalEvent } from '../utils/logger.js';
import { metrics } from '../utils/metrics.js';
import { operationalAlerts } from './operational-alert.service.js';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors.js';
import {
  paymentProvider,
  PhonePeProvider,
  ProviderInitiationError,
  ProviderRefundError,
  type PaymentProviderAdapter,
  type RefundResult,
} from './payment-provider.service.js';
import { sanitizeAuditMetadata } from '../utils/audit.js';
import { changeStock, lockInventory } from './inventory.service.js';
import { applyPaymentObservation } from './payment-lifecycle.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { z } from 'zod';
import type { addressSchema, checkoutSchema, OrderListQuery } from '../validators/commerce.validator.js';

type AddressInput = z.output<typeof addressSchema>;
type CheckoutInput = z.output<typeof checkoutSchema>;
const cartInclude = { items: { include: { variant: { include: { product: true } } } } };
const INITIATION_LEASE_MS = 30_000;
const orderInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            select: {
              name: true,
              slug: true,
              images: {
                select: { url: true },
                take: 1,
                orderBy: { isPrimary: 'desc' as const },
              },
            },
          },
        },
      },
    },
  },
  payments: { include: { refunds: { orderBy: { requestedAt: 'desc' as const } } }, orderBy: { createdAt: 'desc' as const } },
  returnRequest: { include: { items: true } },
};

function toOrderResponse<T extends { status: string; deliveredAt: Date | null; payments: Array<{ status: string }>; returnRequest?: { status: string } | null }>(order: T) {
  const payment = order.payments[0];
  const within7Days = isWithinReturnWindow(order.deliveredAt);
  const hasActiveOrCompletedReturn = Boolean(order.returnRequest && order.returnRequest.status !== 'REJECTED');
  return {
    ...order,
    availableActions: {
      canCancel: order.status === 'PENDING' && Boolean(payment && ['PENDING', 'INITIATED'].includes(payment.status)),
      canReturn: order.status === 'DELIVERED' && !hasActiveOrCompletedReturn && within7Days,
    },
  };
}

function orderNumber() {
  return `PF-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function shippingFee(subtotal: number, delivery: 'standard' | 'express') {
  return delivery === 'express' ? commercePolicy.expressShippingPaise : subtotal >= commercePolicy.freeShippingThresholdPaise ? 0 : commercePolicy.standardShippingPaise;
}

function computeCheckoutHash(
  userId: string,
  input: CheckoutInput,
  cartLines: Array<{ variantId: string; quantity: number }>,
): string {
  const normalizedAddress = input.addressId
    ? { addressId: input.addressId }
    : {
        recipientName: input.shippingAddress?.recipientName?.trim().toLowerCase(),
        phone: input.shippingAddress?.phone?.trim(),
        line1: input.shippingAddress?.line1?.trim().toLowerCase(),
        line2: input.shippingAddress?.line2?.trim().toLowerCase() || '',
        city: input.shippingAddress?.city?.trim().toLowerCase(),
        state: input.shippingAddress?.state?.trim().toLowerCase(),
        postalCode: input.shippingAddress?.postalCode?.trim(),
        country: input.shippingAddress?.country?.trim().toUpperCase() || 'IN',
      };

  const normalizedItems = [...cartLines]
    .map(line => ({ variantId: line.variantId, quantity: line.quantity }))
    .sort((a, b) => a.variantId.localeCompare(b.variantId));

  const canonicalPayload = {
    userId,
    address: normalizedAddress,
    deliveryOptionId: input.deliveryOptionId || 'standard',
    couponCode: input.couponCode ? input.couponCode.trim().toUpperCase() : '',
    items: normalizedItems,
    cartSnapshot: input.cartSnapshot
      ? [...input.cartSnapshot].sort((a, b) => a.variantId.localeCompare(b.variantId))
      : null,
  };

  return createHash('sha256').update(JSON.stringify(canonicalPayload)).digest('hex');
}

export class CommerceService {
  private readonly clientOverride?: ReturnType<typeof getPrismaClient>;
  private readonly providerFactory: () => PaymentProviderAdapter;

  constructor(
    client?: ReturnType<typeof getPrismaClient>,
    providerFactory: () => PaymentProviderAdapter = paymentProvider,
  ) {
    this.clientOverride = client;
    this.providerFactory = providerFactory;
  }


  private get prisma() {
    return this.clientOverride ?? getPrismaClient();
  }

  async saveAddress(userId: string, input: AddressInput) {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${userId}::uuid FOR UPDATE`;
      if (input.isDefault) {
        await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      }
      return tx.address.create({ data: { userId, ...input, country: input.country.toUpperCase() } });
    });
  }

  async updateAddress(userId: string, addressId: string, input: Partial<AddressInput>) {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${userId}::uuid FOR UPDATE`;
      const existing = await tx.address.findFirst({ where: { id: addressId, userId } });
      if (!existing) throw new NotFoundError('Address was not found.', 'ADDRESS_NOT_FOUND');
      if (input.isDefault) {
        await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      }
      return tx.address.update({
        where: { id: addressId },
        data: { ...input, country: input.country ? input.country.toUpperCase() : undefined },
      });
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${userId}::uuid FOR UPDATE`;
      const existing = await tx.address.findFirst({ where: { id: addressId, userId } });
      if (!existing) throw new NotFoundError('Address was not found.', 'ADDRESS_NOT_FOUND');
      await tx.address.delete({ where: { id: addressId } });
      if (existing.isDefault) {
        const next = await tx.address.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
        if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
      return { success: true };
    });
  }

  async addresses(userId: string) {
    return this.prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }], take: 50 });
  }

  async validateCoupon(userId: string, code: string, subtotalPaise: number) {

    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    const now = new Date();
    if (!coupon || !coupon.isActive || (coupon.startsAt && coupon.startsAt > now) || (coupon.endsAt && coupon.endsAt < now)) {
      throw new ValidationError('Coupon code is invalid or has expired.', undefined, 'COUPON_INVALID');
    }
    if (coupon.minimumOrderPaise && subtotalPaise < coupon.minimumOrderPaise) {
      throw new ValidationError(`Coupon requires minimum bag subtotal of Rs ${coupon.minimumOrderPaise / 100}.`, undefined, 'COUPON_MINIMUM_NOT_MET');
    }
    const [usedCount, userCount] = await Promise.all([
      this.prisma.couponRedemption.count({ where: { couponId: coupon.id } }),
      this.prisma.couponRedemption.count({ where: { couponId: coupon.id, userId } }),
    ]);
    if (coupon.usageLimit && usedCount >= coupon.usageLimit) {
      throw new ValidationError('Coupon limit has been reached.', undefined, 'COUPON_LIMIT_REACHED');
    }
    if (userCount > 0) {
      throw new ValidationError('You have already used this coupon code.', undefined, 'COUPON_ALREADY_USED');
    }
    let discountPaise = coupon.discountType === 'PERCENTAGE'
      ? Math.floor((subtotalPaise * coupon.discountValue) / 100)
      : coupon.discountValue;
    if (coupon.maximumDiscountPaise) {
      discountPaise = Math.min(discountPaise, coupon.maximumDiscountPaise);
    }
    return {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountPaise,
      discountRupees: discountPaise / 100,
      minimumOrderPaise: coupon.minimumOrderPaise,
      maximumDiscountPaise: coupon.maximumDiscountPaise,
    };
  }

  async checkout(userId: string, input: CheckoutInput, suppliedKey?: string) {
    const idempotencyKey = suppliedKey ?? input.idempotencyKey ?? randomUUID();

    metrics.recordCheckoutAttempt();
    try {
      const result = await this.prisma.$transaction(async tx => {
        // Cart mutations and checkout share the same owner lock. The durable
        // request and order association either commit together or not at all.
        await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${userId}::uuid FOR UPDATE`;
        const existing = await tx.checkoutIdempotency.findUnique({ where: { key: idempotencyKey } });
        if (existing) {
          if (existing.userId !== userId) throw new ConflictError('Idempotency key conflict.', 'IDEMPOTENCY_CONFLICT');
          if (!existing.orderId || !existing.paymentId) {
            throw new ConflictError('This checkout requires reconciliation before retry.', 'IDEMPOTENCY_IN_PROGRESS');
          }
          const originalLines = await tx.orderItem.findMany({ where: { orderId: existing.orderId } });
          const originalHash = computeCheckoutHash(userId, input, originalLines.map(line => ({ variantId: line.variantId ?? '', quantity: line.quantity })));
          if (originalHash !== existing.requestHash) {
            throw new ConflictError('Conflicting payload submitted with the same idempotency key.', 'IDEMPOTENCY_PAYLOAD_MISMATCH');
          }
          return { paymentId: existing.paymentId };
        }
        const cart = await tx.cart.findUnique({ where: { userId }, include: cartInclude });
        if (!cart?.items.length) throw new ValidationError('Your shopping bag is empty.', undefined, 'CART_EMPTY');
        const requestHash = computeCheckoutHash(userId, input, cart.items);
        const idempotencyRecord = await tx.checkoutIdempotency.create({ data: {
          key: idempotencyKey, userId, requestHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        } });
        const address = input.addressId
          ? await tx.address.findFirst({ where: { id: input.addressId, userId } })
          : null;
        if (input.addressId && !address) {
          throw new NotFoundError('Shipping address was not found.', 'ADDRESS_NOT_FOUND');
        }
        const snapshot = address
          ? {
              recipientName: address.recipientName,
              phone: address.phone,
              line1: address.line1,
              line2: address.line2,
              city: address.city,
              state: address.state,
              postalCode: address.postalCode,
              country: address.country,
            }
          : input.shippingAddress!;

        // Parent product rows precede variant rows in every checkout lock order.
        // Price/status snapshots are read only after these locks are held.
        for (const productId of [...new Set(cart.items.map(line => line.variant.productId))].sort()) {
          await tx.$queryRaw`SELECT id FROM "products" WHERE id = ${productId}::uuid FOR SHARE`;
        }
        await lockInventory(tx, cart.items.map(line => line.variantId));
        const currentCart = await tx.cart.findUnique({ where: { userId }, include: cartInclude });
        if (!currentCart?.items.length || computeCheckoutHash(userId, input, currentCart.items) !== requestHash) {
          throw new ConflictError('Your bag changed. Please review it before checkout.', 'CART_CHANGED');
        }
        const lines = currentCart.items;
        if (lines.some(line => line.variant.status !== 'ACTIVE' || line.variant.product.status !== 'ACTIVE')) {
          throw new ValidationError('One or more products are no longer available.', undefined, 'PRODUCT_UNAVAILABLE');
        }
        if (!input.cartSnapshot && (env.NODE_ENV === 'staging' || env.NODE_ENV === 'production')) {
          throw new ValidationError(
            'A reviewed cart snapshot is required before checkout.',
            undefined,
            'CART_SNAPSHOT_REQUIRED',
          );
        }
        if (input.cartSnapshot) {
          const reviewed = [...input.cartSnapshot]
            .map(line => ({ variantId: line.variantId, quantity: line.quantity, unitPricePaise: line.unitPricePaise }))
            .sort((a, b) => a.variantId.localeCompare(b.variantId));
          const authoritative = lines
            .map(line => ({
              variantId: line.variantId,
              quantity: line.quantity,
              unitPricePaise: line.variant.priceOverridePaise ?? line.variant.product.basePricePaise,
            }))
            .sort((a, b) => a.variantId.localeCompare(b.variantId));
          if (JSON.stringify(reviewed) !== JSON.stringify(authoritative)) {
            throw new ConflictError(
              'Your bag or pricing changed. Please review the updated total before checkout.',
              'CART_SNAPSHOT_CHANGED',
            );
          }
        }
        const subtotal = lines.reduce(
          (sum, line) => sum + (line.variant.priceOverridePaise ?? line.variant.product.basePricePaise) * line.quantity,
          0,
        );

        let discountPaise = 0;
        let couponId: string | undefined;

        if (input.couponCode) {
          const [lockedCoupon] = await tx.$queryRaw<Array<{
            id: string;
            code: string;
            usage_limit: number | null;
            is_active: boolean;
            starts_at: Date | null;
            ends_at: Date | null;
            minimum_order_paise: number | null;
            discount_type: 'PERCENTAGE' | 'FIXED';
            discount_value: number;
            maximum_discount_paise: number | null;
          }>>`
            SELECT id, code, usage_limit, is_active, starts_at, ends_at, minimum_order_paise, discount_type, discount_value, maximum_discount_paise
            FROM "coupons"
            WHERE "code" = ${input.couponCode.toUpperCase()}
            FOR UPDATE
          `;
          const now = new Date();
          if (
            !lockedCoupon ||
            !lockedCoupon.is_active ||
            (lockedCoupon.starts_at && lockedCoupon.starts_at > now) ||
            (lockedCoupon.ends_at && lockedCoupon.ends_at < now) ||
            (lockedCoupon.minimum_order_paise && subtotal < lockedCoupon.minimum_order_paise)
          ) {
            throw new ValidationError('Coupon is not applicable.', undefined, 'COUPON_INVALID');
          }

          // An interactive transaction owns one PostgreSQL connection. Keep
          // its statements sequential so node-postgres never pipelines two
          // queries through the same client.
          const used = await tx.couponRedemption.count({ where: { couponId: lockedCoupon.id } });
          const userUsed = await tx.couponRedemption.count({ where: { couponId: lockedCoupon.id, userId } });

          if (lockedCoupon.usage_limit && used >= lockedCoupon.usage_limit) {
            throw new ValidationError('Coupon usage limit reached.', undefined, 'COUPON_LIMIT_REACHED');
          }
          if (userUsed > 0) {
            throw new ValidationError('You have already used this promotional code.', undefined, 'COUPON_ALREADY_USED');
          }

          discountPaise = lockedCoupon.discount_type === 'PERCENTAGE'
            ? Math.floor((subtotal * lockedCoupon.discount_value) / 100)
            : lockedCoupon.discount_value;
          if (lockedCoupon.maximum_discount_paise) {
            discountPaise = Math.min(discountPaise, lockedCoupon.maximum_discount_paise);
          }
          couponId = lockedCoupon.id;
        }

        discountPaise = Math.min(subtotal, discountPaise);
        const shippingChargePaise = shippingFee(subtotal - discountPaise, input.deliveryOptionId);
        const totalPaise = Math.max(0, subtotal - discountPaise + shippingChargePaise);

        const order = await tx.order.create({
          data: {
            orderNumber: orderNumber(),
            userId,
            shippingAddress: snapshot,
            subtotalPaise: subtotal,
            discountPaise,
            shippingChargePaise,
            totalPaise,
            items: {
              create: lines.map(line => ({
                variantId: line.variantId,
                productName: line.variant.product.name,
                sku: line.variant.sku,
                size: line.variant.size,
                colorName: line.variant.colorName,
                unitPricePaise: line.variant.priceOverridePaise ?? line.variant.product.basePricePaise,
                quantity: line.quantity,
                lineTotalPaise: (line.variant.priceOverridePaise ?? line.variant.product.basePricePaise) * line.quantity,
              })),
            },
          },
        });

        for (const line of lines) {
          await changeStock(tx, line.variantId, { delta: -line.quantity }, {
            type: 'SALE', reason: 'Checkout order reservation', referenceType: 'ORDER', referenceId: order.id,
          });
          await tx.inventoryReservation.create({
            data: {
              orderId: order.id,
              variantId: line.variantId,
              quantity: line.quantity,
              expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            },
          });
        }

        if (couponId) {
          await tx.couponRedemption.create({ data: { couponId, userId, orderId: order.id } });
        }

        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            provider: 'PHONEPE',
            method: 'UPI',
            amountPaise: totalPaise,
            idempotencyKey,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            initiation: { create: {} },
          },
        });

        logger.info({ orderId: order.id, paymentId: payment.id }, 'Checkout created and inventory reserved.');
        metrics.recordCheckoutSuccess();
        metrics.recordReservationCreated(lines.length);
        logOperationalEvent('checkout_completed', { orderId: order.id, paymentId: payment.id });
        await tx.checkoutIdempotency.update({ where: { id: idempotencyRecord.id }, data: {
          orderId: order.id, paymentId: payment.id,
        } });
        return { paymentId: payment.id };
      });
      // A provider failure never erases a committed order/request association.
      return await this.initiate(userId, result.paymentId);
    } catch (checkoutError) {
      metrics.recordCheckoutFailure();
      throw checkoutError;
    }
  }

  async initiate(userId: string, paymentId: string) {
    const leaseToken = randomUUID();
    const claim = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "payments" WHERE id = ${paymentId}::uuid FOR UPDATE`;
      const payment = await tx.payment.findFirst({
        where: { id: paymentId, order: { userId } },
        include: { order: true, initiation: true },
      });
      if (!payment) throw new NotFoundError('Payment was not found.', 'PAYMENT_NOT_FOUND');

      if (payment.order.status === 'CANCELLED') {
        throw new ConflictError('Cannot initiate payment for a cancelled order.', 'ORDER_CANCELLED');
      }
      if (payment.order.status === 'CONFIRMED' || payment.order.status === 'DELIVERED') {
        return { action: 'RETURN' as const, session: this.paymentSession(payment.id, payment.status, payment.orderId, payment.initiation) };
      }
      if (payment.order.status !== 'PENDING') {
        throw new ConflictError('Order is in an invalid state for payment initiation.', 'INVALID_ORDER_STATE');
      }
      if (payment.status === 'SUCCESS' || payment.status === 'PAID') {
        return { action: 'RETURN' as const, session: this.paymentSession(payment.id, payment.status, payment.orderId, payment.initiation) };
      }
      if (payment.expiresAt && payment.expiresAt <= new Date()) {
        return { action: 'EXPIRE' as const };
      }
      if (!['PENDING', 'INITIATED'].includes(payment.status)) {
        throw new ConflictError('This payment cannot be retried.', 'PAYMENT_NOT_PAYABLE');
      }

      const initiation = payment.initiation ?? await tx.paymentInitiation.create({
        data: { paymentId: payment.id },
      });
      if (initiation.state === 'SUCCEEDED') {
        return { action: 'RETURN' as const, session: this.paymentSession(payment.id, payment.status, payment.orderId, initiation) };
      }
      if (initiation.state === 'UNKNOWN') {
        return { action: 'RETURN' as const, session: this.paymentSession(payment.id, payment.status, payment.orderId, initiation) };
      }
      if (initiation.state === 'LEASED') {
        if (initiation.leaseExpiresAt && initiation.leaseExpiresAt > new Date()) {
          return { action: 'RETURN' as const, session: this.paymentSession(payment.id, payment.status, payment.orderId, initiation) };
        }
        const unknown = await tx.paymentInitiation.update({
          where: { paymentId: payment.id },
          data: {
            state: 'UNKNOWN',
            leaseToken: null,
            leaseExpiresAt: null,
            lastErrorCode: 'INITIATION_LEASE_EXPIRED',
            lastErrorAt: new Date(),
          },
        });
        return { action: 'RETURN' as const, session: this.paymentSession(payment.id, payment.status, payment.orderId, unknown) };
      }

      const leased = await tx.paymentInitiation.update({
        where: { paymentId: payment.id },
        data: {
          state: 'LEASED',
          leaseToken,
          leaseExpiresAt: new Date(Date.now() + INITIATION_LEASE_MS),
          attemptCount: { increment: 1 },
          lastErrorCode: null,
          lastErrorAt: null,
        },
      });
      return {
        action: 'CALL_PROVIDER' as const,
        payment: {
          id: payment.id,
          orderId: payment.orderId,
          amountPaise: payment.amountPaise,
          orderNumber: payment.order.orderNumber,
        },
        initiation: leased,
      };
    });

    if (claim.action === 'RETURN') return claim.session;
    if (claim.action === 'EXPIRE') return this.complete(userId, paymentId, 'EXPIRED');

    let initiated: Awaited<ReturnType<PaymentProviderAdapter['initiate']>>;
    try {
      initiated = await this.providerFactory().initiate({
        paymentId: claim.payment.id,
        amountPaise: claim.payment.amountPaise,
        orderNumber: claim.payment.orderNumber,
      });
    } catch (error) {
      const outcome = error instanceof ProviderInitiationError && error.outcome === 'DEFINITE_FAILURE'
        ? 'FAILED'
        : 'UNKNOWN';
      await this.prisma.paymentInitiation.updateMany({
        where: { paymentId: claim.payment.id, state: 'LEASED', leaseToken },
        data: {
          state: outcome,
          leaseToken: null,
          leaseExpiresAt: null,
          lastErrorCode: error instanceof ProviderInitiationError ? error.code : 'PROVIDER_INITIATION_UNKNOWN',
          lastErrorAt: new Date(),
        },
      });
      if (outcome === 'UNKNOWN') {
        void operationalAlerts.deliver({
          code: 'PAYMENT_STATE_UNKNOWN', severity: 'critical',
          summary: 'Payment initiation outcome is unknown and requires provider reconciliation.',
          attributes: { paymentId: claim.payment.id, orderId: claim.payment.orderId },
        }, `payment-initiation-unknown:${claim.payment.id}`);
      }
      throw error;
    }

    const session = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "payments" WHERE id = ${claim.payment.id}::uuid FOR UPDATE`;
      const persisted = await tx.paymentInitiation.updateMany({
        where: { paymentId: claim.payment.id, state: 'LEASED', leaseToken },
        data: {
          state: 'SUCCEEDED',
          leaseToken: null,
          leaseExpiresAt: null,
          providerReference: initiated.providerReference,
          redirectUrl: initiated.redirectUrl,
          lastErrorCode: null,
          lastErrorAt: null,
        },
      });
      if (persisted.count > 0) {
        await tx.payment.updateMany({
          where: { id: claim.payment.id, status: { in: ['PENDING', 'INITIATED'] } },
          data: { status: 'INITIATED', providerReference: initiated.providerReference },
        });
      }
      const current = await tx.payment.findUniqueOrThrow({
        where: { id: claim.payment.id },
        include: { initiation: true },
      });
      return this.paymentSession(current.id, current.status, current.orderId, current.initiation);
    });

    logger.info(
      { orderId: claim.payment.orderId, paymentId: claim.payment.id, providerReference: initiated.providerReference },
      'Payment initiation response persisted.',
    );
    metrics.recordPaymentInitiated();
    logOperationalEvent('payment_initiated', { orderId: claim.payment.orderId, paymentId: claim.payment.id });
    return session;
  }

  async complete(userId: string, paymentId: string, result: 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED') {
    const outcome = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${userId}::uuid FOR KEY SHARE`;
      const owned = await tx.payment.findFirst({ where: { id: paymentId, order: { userId } } });
      if (!owned) throw new NotFoundError('Payment was not found.', 'PAYMENT_NOT_FOUND');
      const transition = await applyPaymentObservation(tx, paymentId, {
        source: 'DEMO',
        state: result,
        deduplicationKey: `demo:${paymentId}:${result}`,
        amountPaise: owned.amountPaise,
      });
      return transition;
    });

    if (outcome.changed && result === 'SUCCESS') {
      metrics.recordPaymentSucceeded();
      metrics.recordReservationConsumed();
      logOperationalEvent('payment_succeeded', { orderId: outcome.payment.orderId, paymentId });
    } else if (outcome.changed) {
      if (result === 'FAILED') metrics.recordPaymentFailed();
      else if (result === 'CANCELLED') metrics.recordPaymentCancelled();
      else metrics.recordPaymentExpired();
      metrics.recordReservationReleased();
      logOperationalEvent('payment_failed', { orderId: outcome.payment.orderId, paymentId, result });
    }
    return this.paymentSession(paymentId, outcome.payment.status, outcome.payment.orderId);
  }

  async handlePhonePeCallback(
    rawBody: string,
    authorization?: string,
    routePaymentId?: string,
  ) {
    if (!authorization) {
      throw new UnauthorizedError('Missing PhonePe webhook authorization header.', 'MISSING_SIGNATURE');
    }

    const phonePe = new PhonePeProvider();
    if (!phonePe.verifyWebhookAuthorization(authorization)) {
      metrics.recordPaymentMismatch();
      logger.warn({ paymentId: routePaymentId }, 'PhonePe webhook authorization verification failed.');
      throw new UnauthorizedError('Invalid PhonePe webhook authorization.', 'INVALID_SIGNATURE');
    }

    let decodedJson: {
      event?: string;
      payload?: {
        merchantId?: string;
        merchantOrderId?: string;
        orderId?: string;
        amount?: number;
        state?: string;
        errorCode?: string;
        paymentDetails?: Array<{ transactionId?: string; state?: string }>;
      };
    };

    try {
      decodedJson = JSON.parse(rawBody);
    } catch {
      throw new ValidationError('Malformed PhonePe callback payload.', undefined, 'INVALID_CALLBACK_PAYLOAD');
    }

    if (!['checkout.order.completed', 'checkout.order.failed'].includes(decodedJson.event ?? '')) {
      throw new ValidationError('Unsupported PhonePe webhook event.', undefined, 'INVALID_CALLBACK_EVENT');
    }
    const payload = decodedJson.payload;
    const paymentId = payload?.merchantOrderId || routePaymentId;
    if (!paymentId) {
      throw new ValidationError('Missing merchantOrderId in callback payload.', undefined, 'INVALID_PAYMENT_ID');
    }
    if (routePaymentId && payload?.merchantOrderId !== routePaymentId) {
      throw new ConflictError('Callback route and merchant transaction identifiers do not match.', 'PAYMENT_ID_MISMATCH');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) {
      throw new NotFoundError(`Payment not found for ID: ${paymentId}`, 'PAYMENT_NOT_FOUND');
    }

    // A configured live merchant contract requires an explicit matching merchant.
    if (env.PAYMENT_PROVIDER === 'phonepe' && !payload?.merchantId) {
      throw new ValidationError('Missing merchantId in callback payload.', undefined, 'MERCHANT_ID_REQUIRED');
    }
    if (env.PHONEPE_MERCHANT_ID && payload?.merchantId !== env.PHONEPE_MERCHANT_ID) {
      throw new ConflictError('PhonePe merchant ID mismatch.', 'MERCHANT_MISMATCH');
    }

    // Validate amount
    const reportedAmount = payload?.amount;
    if (reportedAmount === undefined) {
      throw new ValidationError('Missing amount in callback payload.', undefined, 'PAYMENT_AMOUNT_REQUIRED');
    }
    if (reportedAmount !== payment.amountPaise) {
      void operationalAlerts.deliver({
        code: 'PAYMENT_RECONCILIATION_MISMATCH', severity: 'critical',
        summary: 'PhonePe callback amount did not match the authoritative payment amount.',
        attributes: { paymentId },
      }, `payment-amount:${paymentId}`);
      logger.error(
        { paymentId, expectedAmount: payment.amountPaise, reportedAmount },
        'PhonePe payment amount mismatch detected!',
      );
      throw new ConflictError(
        `Amount mismatch: expected ${payment.amountPaise} paise, received ${reportedAmount} paise.`,
        'PAYMENT_AMOUNT_MISMATCH',
      );
    }

    // Map PhonePe state
    let targetResult: 'SUCCESS' | 'FAILED' | 'PENDING' = 'PENDING';
    const state = payload?.state;
    if (state === 'COMPLETED' && decodedJson.event === 'checkout.order.completed') {
      targetResult = 'SUCCESS';
    } else if (state === 'FAILED' && decodedJson.event === 'checkout.order.failed') {
      targetResult = 'FAILED';
    }

    const providerReference = payload?.paymentDetails?.find(detail => detail.state === 'COMPLETED')?.transactionId
      ?? payload?.paymentDetails?.[0]?.transactionId
      ?? payload?.orderId;

    if (targetResult === 'PENDING') {
      await this.prisma.$transaction(tx => applyPaymentObservation(tx, payment.id, {
        source: 'CALLBACK',
        state: 'PENDING',
        deduplicationKey: `callback:${createHash('sha256').update(rawBody).digest('hex')}`,
        amountPaise: reportedAmount,
        merchantId: payload?.merchantId,
        providerReference,
        responseCode: payload?.errorCode,
      }));
      return this.paymentSession(payment.id, payment.status, payment.orderId);
    }
    const transition = await this.prisma.$transaction(tx => applyPaymentObservation(tx, payment.id, {
      source: 'CALLBACK',
      state: targetResult,
      deduplicationKey: `callback:${createHash('sha256').update(rawBody).digest('hex')}`,
      amountPaise: reportedAmount,
      merchantId: payload?.merchantId,
      providerReference,
      responseCode: payload?.errorCode,
    }));
    if (transition.disposition === 'LATE_CAPTURE') {
      metrics.recordPaymentMismatch();
      void operationalAlerts.deliver({
        code: 'PAYMENT_RECONCILIATION_MISMATCH', severity: 'critical',
        summary: 'A payment was captured after its inventory reservation expired.',
        attributes: { paymentId, orderId: payment.orderId },
      }, `late-capture:${paymentId}`);
      logger.error({ paymentId, orderId: payment.orderId }, 'Late payment capture recorded and refund workflow created.');
    }
    return this.paymentSession(payment.id, transition.payment.status, transition.payment.orderId);
  }

  async paymentStatus(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, order: { userId } },
      include: { order: true, initiation: true },
    });
    if (!payment) throw new NotFoundError('Payment was not found.', 'PAYMENT_NOT_FOUND');

    // If INITIATED and PhonePe provider, actively reconcile with PhonePe status API
    if (payment.status === 'INITIATED' && env.PAYMENT_PROVIDER === 'phonepe') {
      try {
        const provider = this.providerFactory();
        if (!provider.checkStatus) throw new ConflictError('Provider status verification is unavailable.', 'PAYMENT_STATUS_UNAVAILABLE');
        const statusCheck = await provider.checkStatus(payment.id);
        if (statusCheck.state === 'COMPLETED') {
          if (statusCheck.amountPaise === undefined || statusCheck.amountPaise !== payment.amountPaise) {
            logger.error({ paymentId, expected: payment.amountPaise, received: statusCheck.amountPaise }, 'Reconciliation amount mismatch');
            metrics.recordPaymentMismatch();
            void operationalAlerts.deliver({
              code: 'PAYMENT_RECONCILIATION_MISMATCH', severity: 'critical',
              summary: 'Payment status reconciliation returned a non-authoritative amount.',
              attributes: { paymentId },
            }, `status-amount:${paymentId}`);
          } else {
            const transition = await this.prisma.$transaction(tx => applyPaymentObservation(tx, payment.id, {
              source: 'STATUS_POLL', state: 'SUCCESS', amountPaise: statusCheck.amountPaise,
              providerReference: statusCheck.providerReference, responseCode: statusCheck.responseCode,
              deduplicationKey: `status-poll:${payment.id}:SUCCESS:${statusCheck.providerReference ?? statusCheck.responseCode ?? 'none'}`,
            }));
            return this.paymentSession(payment.id, transition.payment.status, transition.payment.orderId);
          }
        } else if (statusCheck.state === 'FAILED') {
          const transition = await this.prisma.$transaction(tx => applyPaymentObservation(tx, payment.id, {
            source: 'STATUS_POLL', state: 'FAILED', amountPaise: statusCheck.amountPaise,
            providerReference: statusCheck.providerReference, responseCode: statusCheck.responseCode,
            deduplicationKey: `status-poll:${payment.id}:FAILED:${statusCheck.providerReference ?? statusCheck.responseCode ?? 'none'}`,
          }));
          return this.paymentSession(payment.id, transition.payment.status, transition.payment.orderId);
        }
      } catch (err) {
        logger.warn(
          { paymentId, error: err instanceof Error ? err.message : 'UnknownError' },
          'PhonePe status check reconciliation skipped due to provider error.',
        );
      }
    }

    return this.paymentSession(payment.id, payment.status, payment.orderId, payment.initiation);
  }

  async reconcilePayment(paymentId: string, operatorId?: string): Promise<{
    paymentId: string;
    orderId: string;
    previousStatus: string;
    newStatus: string;
    reconciled: boolean;
    details: string;
  }> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
    if (!payment) throw new NotFoundError(`Payment ${paymentId} was not found.`, 'PAYMENT_NOT_FOUND');
    const previousStatus = payment.status;
    if (['SUCCESS', 'PAID', 'REFUNDED'].includes(payment.status)) {
      return {
        paymentId, orderId: payment.orderId, previousStatus, newStatus: payment.status,
        reconciled: false,
        details: 'Payment is already in a confirmed successful state; fulfillment state is preserved.',
      };
    }

    const provider = this.providerFactory();
    if (!provider.checkStatus) {
      return {
        paymentId, orderId: payment.orderId, previousStatus, newStatus: payment.status,
        reconciled: false,
        details: 'The active payment provider does not expose an external status check.',
      };
    }

    let check: Awaited<ReturnType<NonNullable<PaymentProviderAdapter['checkStatus']>>>;
    try {
      // Provider I/O happens before the short locked transaction.
      check = await provider.checkStatus(payment.id);
    } catch (err) {
      logger.warn({ paymentId, error: err instanceof Error ? err.message : 'UnknownError' }, 'Payment provider status check failed during reconciliation.');
      return {
        paymentId, orderId: payment.orderId, previousStatus, newStatus: payment.status,
        reconciled: false,
        details: `Provider status check failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }

    if (check.state === 'COMPLETED' && (typeof check.amountPaise !== 'number' || check.amountPaise !== payment.amountPaise)) {
      logger.error({ paymentId, expected: payment.amountPaise, received: check.amountPaise }, 'Reconciliation amount mismatch');
      metrics.recordPaymentMismatch();
      void operationalAlerts.deliver({
        code: 'PAYMENT_RECONCILIATION_MISMATCH', severity: 'critical',
        summary: 'Payment reconciliation returned an invalid or mismatching amount.',
        attributes: { paymentId, expected: payment.amountPaise, received: check.amountPaise ?? 0 },
      }, `reconciliation-amount:${paymentId}`);

      return {
        paymentId, orderId: payment.orderId, previousStatus, newStatus: payment.status,
        reconciled: false,
        details: `Reconciliation rejected: provider amount (${check.amountPaise}) did not match authoritative payment amount (${payment.amountPaise}).`,
      };
    }

    const observedState = check.state === 'COMPLETED' ? 'SUCCESS' : check.state;
    const transition = await this.prisma.$transaction(tx => applyPaymentObservation(tx, payment.id, {

      source: 'RECONCILIATION',
      state: observedState,
      deduplicationKey: `reconciliation:${payment.id}:${observedState}:${check.providerReference ?? check.responseCode ?? 'none'}`,
      amountPaise: check.amountPaise,
      providerReference: check.providerReference,
      responseCode: check.responseCode,
    }));
    if (transition.changed) metrics.recordPaymentReconciled();
    if (transition.disposition === 'LATE_CAPTURE') {
      metrics.recordPaymentMismatch();
      void operationalAlerts.deliver({
        code: 'PAYMENT_RECONCILIATION_MISMATCH', severity: 'critical',
        summary: 'Operator reconciliation found a late payment capture.',
        attributes: { paymentId: payment.id, orderId: payment.orderId },
      }, `operator-late-capture:${payment.id}`);
    }
    logOperationalEvent('payment_reconciled', {
      paymentId: payment.id,
      orderId: payment.orderId,
      operatorId,
      result: observedState,
      disposition: transition.disposition,
    });
    return {
      paymentId,
      orderId: payment.orderId,
      previousStatus,
      newStatus: transition.payment.status,
      reconciled: transition.changed,
      details: transition.disposition === 'LATE_CAPTURE'
        ? 'Late capture recorded and a durable refund was created while cancelled inventory remained released.'
        : observedState === 'PENDING'
          ? 'Gateway status is still pending; the observation was recorded without mutation.'
          : transition.changed
            ? observedState === 'FAILED'
              ? 'Payment marked failed and reservations released via reconciliation.'
              : 'Payment successfully synchronized and order confirmed.'
            : `Payment observation ${observedState} was ${transition.disposition.toLowerCase()}.`,
    };
  }

  async processRefund(refundId: string) {
    const provider = this.providerFactory();
    if (!provider.refund) {
      throw new ConflictError(
        'The configured payment contract does not support automated refunds.',
        'REFUND_CAPABILITY_UNAVAILABLE',
      );
    }

    const claim = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "payment_refunds" WHERE id = ${refundId}::uuid FOR UPDATE`;
      const refund = await tx.paymentRefund.findUnique({ where: { id: refundId } });
      if (!refund) throw new NotFoundError('Refund was not found.', 'REFUND_NOT_FOUND');
      if (refund.status !== 'SUCCEEDED' && provider.refundMode !== refund.mode) {
        throw new ConflictError('Refund mode does not match the configured provider.', 'REFUND_PROVIDER_MISMATCH');
      }
      if (refund.status === 'PENDING' && provider.checkRefundStatus) {
        return { action: 'CHECK_STATUS' as const, refund };
      }
      if (refund.status === 'SUCCEEDED' || refund.status === 'PENDING') {
        return { action: 'RETURN' as const, refund };
      }
      const pending = await tx.paymentRefund.update({
        where: { id: refund.id },
        data: { status: 'PENDING', attemptCount: { increment: 1 }, failureCode: null, processedAt: null },
      });
      return { action: 'CALL_PROVIDER' as const, refund: pending };
    });
    if (claim.action === 'RETURN') return claim.refund;

    let providerResult: RefundResult;
    try {
      providerResult = claim.action === 'CHECK_STATUS'
        ? await provider.checkRefundStatus!(claim.refund.id)
        : await provider.refund({
        refundId: claim.refund.id,
        paymentId: claim.refund.paymentId,
        amountPaise: claim.refund.amountPaise,
      });
      if (providerResult.amountPaise !== claim.refund.amountPaise) {
        throw new ProviderRefundError('Refund amount does not match the ledger.', 'REFUND_AMOUNT_MISMATCH', 'UNKNOWN');
      }
    } catch (error) {
      const definite = error instanceof ProviderRefundError && error.outcome === 'DEFINITE_FAILURE';
      const failedRefund = await this.prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "payment_refunds" WHERE id = ${refundId}::uuid FOR UPDATE`;
        const current = await tx.paymentRefund.findUniqueOrThrow({ where: { id: refundId } });
        if (current.status !== 'PENDING') return current;
        return tx.paymentRefund.update({
          where: { id: refundId },
          data: {
            status: definite ? 'FAILED' : 'PENDING',
            failureCode: error instanceof ProviderRefundError ? error.code : 'REFUND_OUTCOME_UNKNOWN',
            processedAt: definite ? new Date() : null,
          },
        });
      });
      void operationalAlerts.deliver({
        code: definite ? 'REFUND_PROCESSING_FAILED' : 'PAYMENT_STATE_UNKNOWN',
        severity: 'critical',
        summary: definite ? 'The payment provider rejected a refund.' : 'The refund outcome is unknown and requires reconciliation.',
        attributes: { refundId, paymentId: claim.refund.paymentId },
      }, `refund:${refundId}:${definite ? 'failed' : 'unknown'}`);
      metrics.recordReturnFailure();
      return failedRefund;
    }

    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "payment_refunds" WHERE id = ${refundId}::uuid FOR UPDATE`;
      const current = await tx.paymentRefund.findUniqueOrThrow({ where: { id: refundId } });
      if (current.status !== 'PENDING') return current;
      if (providerResult.state !== 'COMPLETED') {
        return tx.paymentRefund.update({ where: { id: refundId }, data: {
          status: providerResult.state === 'FAILED' ? 'FAILED' : 'PENDING',
          providerReference: providerResult.providerReference,
          failureCode: providerResult.state === 'FAILED' ? 'PROVIDER_REFUND_FAILED' : null,
          processedAt: providerResult.state === 'FAILED' ? new Date() : null,
        } });
      }
      const completed = await tx.paymentRefund.update({
        where: { id: refundId },
        data: {
          status: 'SUCCEEDED',
          providerReference: providerResult.providerReference,
          failureCode: null,
          processedAt: new Date(),
        },
      });
      await tx.$queryRaw`SELECT id FROM "payments" WHERE id = ${current.paymentId}::uuid FOR UPDATE`;
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: current.paymentId } });
      const total = await tx.paymentRefund.aggregate({
        where: { paymentId: payment.id, status: 'SUCCEEDED' },
        _sum: { amountPaise: true },
      });
      if ((total._sum.amountPaise ?? 0) === payment.amountPaise) {
        await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
        const otherCaptured = await tx.payment.count({
          where: { orderId: payment.orderId, id: { not: payment.id }, status: { in: ['SUCCESS', 'PAID'] } },
        });
        await tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: otherCaptured > 0 ? 'SUCCESS' : 'REFUNDED' },
        });
      }
      metrics.recordReturnRefunded();
      return completed;
    });
  }

  async orders(userId: string, query: OrderListQuery = { page: 1, limit: 20, sort: 'newest' }) {
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(query.status === 'PAYMENT_FAILED'
        ? { paymentStatus: 'FAILED' }
        : query.status ? { status: query.status } : {}),
      ...(query.search ? { orderNumber: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const orderBy: Prisma.OrderOrderByWithRelationInput = query.sort === 'oldest'
      ? { createdAt: 'asc' }
      : query.sort === 'total-high'
        ? { totalPaise: 'desc' }
        : query.sort === 'total-low'
          ? { totalPaise: 'asc' }
          : { createdAt: 'desc' };
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({ where, include: orderInclude, orderBy: [orderBy, { id: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
      this.prisma.order.count({ where }),
    ]);
    return { items: items.map(toOrderResponse), page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) };
  }

  async order(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId }, include: orderInclude });
    if (!order) throw new NotFoundError('Order was not found.', 'ORDER_NOT_FOUND');
    return toOrderResponse(order);
  }

  async cancel(userId: string, orderId: string) {
    const order = await this.order(userId, orderId);
    const payment = order.payments[0];
    if (!payment || !['PENDING', 'INITIATED'].includes(payment.status)) {
      throw new ConflictError('This order cannot be cancelled.', 'ORDER_NOT_CANCELLABLE');
    }
    // complete() re-reads and locks the payment, so this preliminary read
    // cannot cause a stale cancellation or a second inventory release.
    await this.complete(userId, payment.id, 'CANCELLED');
    return this.order(userId, orderId);
  }

  async requestReturn(
    userId: string,
    orderId: string,
    reason: string,
    returnItems?: Array<{ orderItemId: string; quantity: number }>,
  ) {
    const updated = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${userId}::uuid FOR KEY SHARE`;
      await tx.$queryRaw`SELECT id FROM "orders" WHERE id = ${orderId}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
      const order = await tx.order.findFirst({
        where: { id: orderId, userId },
        include: { items: true, returnRequest: true },
      });
      if (!order) throw new NotFoundError('Order was not found.', 'ORDER_NOT_FOUND');
      if (order.status !== 'DELIVERED') {
        throw new ConflictError('Only delivered orders can be returned.', 'ORDER_NOT_RETURNABLE');
      }
      if (!order.deliveredAt) {
        throw new ConflictError('Delivery time is unavailable for this order.', 'DELIVERY_TIME_MISSING');
      }
      const within7Days = isWithinReturnWindow(order.deliveredAt);
      if (!within7Days) {
        throw new ConflictError('The 7-day return window for this order has expired.', 'RETURN_WINDOW_EXPIRED');
      }
      if (order.returnRequest) {
        if (order.returnRequest.status === 'REQUESTED' || order.returnRequest.status === 'COMPLETED') {
          throw new ConflictError('A return has already been requested for this order.', 'RETURN_ALREADY_REQUESTED');
        }
        await tx.orderReturnItem.deleteMany({ where: { returnId: order.returnRequest.id } });
        await tx.orderReturn.delete({ where: { id: order.returnRequest.id } });
      }

      const requestedItems = returnItems?.length
        ? returnItems
        : order.items.map(item => ({ orderItemId: item.id, quantity: item.quantity }));
      const seen = new Set<string>();
      for (const reqItem of requestedItems) {
        if (seen.has(reqItem.orderItemId)) {
          throw new ValidationError('Each order item may appear only once.', undefined, 'DUPLICATE_RETURN_ITEM');
        }
        seen.add(reqItem.orderItemId);
        const orderItem = order.items.find(item => item.id === reqItem.orderItemId);
        if (!orderItem) throw new ValidationError(
          `Order item ${reqItem.orderItemId} was not found in this order.`,
          undefined,
          'RETURN_ITEM_NOT_FOUND',
        );
        if (reqItem.quantity > orderItem.quantity) throw new ValidationError(
          `Requested return quantity (${reqItem.quantity}) exceeds purchased quantity (${orderItem.quantity}) for item ${orderItem.productName}.`,
          undefined,
          'RETURN_QUANTITY_EXCEEDED',
        );
      }

      const returnRequest = await tx.orderReturn.create({
        data: { orderId, reason, items: { create: requestedItems } },
      });
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: 'RETURN_REQUESTED' },
        include: orderInclude,
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'ORDER_RETURN_REQUESTED',
          entityType: 'order',
          entityId: orderId,
          metadata: sanitizeAuditMetadata({ reason, items: requestedItems, returnId: returnRequest.id }) as Prisma.InputJsonValue,
        },
      });
      return updated;
    });
    metrics.recordReturnRequested();
    logOperationalEvent('return_requested', { orderId, userId, reason });
    logger.info({ orderId, userId, reason, items: returnItems }, 'Order return requested.');
    return toOrderResponse(updated);
  }

  async releaseExpiredReservations(): Promise<{ releasedCount: number; skippedDueToDistributedLock?: boolean }> {
    const now = new Date();
    return this.prisma.$transaction(async tx => {
      // Advisory transaction locks coordinate all application instances while
      // keeping ownership in PostgreSQL. A process-local boolean cannot
      // prevent duplicate sweeps in PM2 cluster or multi-container deploys.
      const lockRows = await tx.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_try_advisory_xact_lock(hashtext('purvaja:reservation-expiry')) AS locked
      `;
      if (!lockRows[0]?.locked) {
        logger.debug('Reservation expiry sweep skipped because another instance owns the database lock.');
        return { releasedCount: 0, skippedDueToDistributedLock: true };
      }

      const expiredReservations = await tx.inventoryReservation.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: { lte: now },
          order: {
            status: 'PENDING',
            paymentStatus: { in: ['PENDING', 'INITIATED'] },
          },
        },
        select: { orderId: true },
        take: 100,
      });

      const orderIds = [...new Set(expiredReservations.map(r => r.orderId))];
      let releasedCount = 0;

      for (const orderId of orderIds) {
        // Lock payment first, exactly as complete(), then re-check every
        // state inside the same transaction before expiring the reservation.
        const payment = await tx.payment.findFirst({ where: { orderId }, orderBy: { createdAt: 'desc' } });
        if (payment) await tx.$queryRaw`SELECT id FROM "payments" WHERE id = ${payment.id}::uuid FOR UPDATE`;
        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (!order || order.status !== 'PENDING' || !payment || !['PENDING', 'INITIATED'].includes(payment.status)) continue;
        if (payment.expiresAt && payment.expiresAt > now) continue;

        const activeCount = await tx.inventoryReservation.count({ where: { orderId, status: 'ACTIVE' } });
        const transition = await applyPaymentObservation(tx, payment.id, {
          source: 'EXPIRY',
          state: 'EXPIRED',
          amountPaise: payment.amountPaise,
          deduplicationKey: `expiry:${payment.id}`,
        });
        if (!transition.changed) continue;

        releasedCount += activeCount;
        metrics.recordReservationExpired(activeCount);
        logOperationalEvent('reservation_expired', { orderId, releasedCount: activeCount });
        logger.info({ orderId }, 'Expired checkout reservations released and order cancelled.');
      }

      return { releasedCount };
    });
  }

  private paymentSession(
    paymentId: string,
    paymentStatus: string,
    orderId: string,
    initiation?: { state: string; redirectUrl: string | null } | null,
  ) {
    const payable = paymentStatus === 'PENDING' || paymentStatus === 'INITIATED';
    return {
      paymentId,
      orderId,
      paymentStatus,
      initiationStatus: initiation?.state ?? (paymentStatus === 'INITIATED' ? 'SUCCEEDED' : 'READY'),
      redirectUrl: initiation?.redirectUrl ?? (payable
        ? `${env.FRONTEND_URL}/checkout/payment-status?paymentId=${encodeURIComponent(paymentId)}`
        : undefined),
    };
  }
}
