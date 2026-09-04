import { randomUUID } from 'node:crypto';
import { getPrismaClient } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import { paymentProvider } from './payment-provider.service.js';
import type { z } from 'zod';
import type { addressSchema, checkoutSchema } from '../validators/commerce.validator.js';

type AddressInput = z.output<typeof addressSchema>;
type CheckoutInput = z.output<typeof checkoutSchema>;
const cartInclude = { items: { include: { variant: { include: { product: true } } } } };
const orderInclude = { items: true, payments: { orderBy: { createdAt: 'desc' as const } } };

function orderNumber() { return `PF-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`; }
function shippingFee(subtotal: number, delivery: 'standard' | 'express') { return delivery === 'express' ? 29900 : subtotal >= 250000 ? 0 : 19900; }

export class CommerceService {
  private get prisma() { return getPrismaClient(); }

  async saveAddress(userId: string, input: AddressInput) {
    if (input.isDefault) await this.prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    return this.prisma.address.create({ data: { userId, ...input, country: input.country.toUpperCase() } });
  }
  async addresses(userId: string) { return this.prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }] }); }

  async checkout(userId: string, input: CheckoutInput, suppliedKey?: string) {
    const idempotencyKey = suppliedKey ?? input.idempotencyKey ?? randomUUID();
    const prior = await this.prisma.payment.findUnique({ where: { idempotencyKey }, include: { order: true } });
    if (prior) {
      if (prior.order.userId !== userId) throw new ConflictError('Idempotency key conflict.', 'IDEMPOTENCY_CONFLICT');
      return this.paymentSession(prior.id, prior.status, prior.order.id);
    }
    const result = await this.prisma.$transaction(async tx => {
      const cart = await tx.cart.findUnique({ where: { userId }, include: cartInclude });
      if (!cart?.items.length) throw new ValidationError('Your shopping bag is empty.', undefined, 'CART_EMPTY');
      const address = input.addressId ? await tx.address.findFirst({ where: { id: input.addressId, userId } }) : null;
      if (input.addressId && !address) throw new NotFoundError('Shipping address was not found.', 'ADDRESS_NOT_FOUND');
      const snapshot = address ? { recipientName: address.recipientName, phone: address.phone, line1: address.line1, line2: address.line2, city: address.city, state: address.state, postalCode: address.postalCode, country: address.country } : input.shippingAddress!;
      const lines = cart.items;
      const subtotal = lines.reduce((sum, line) => sum + (line.variant.priceOverridePaise ?? line.variant.product.basePricePaise) * line.quantity, 0);
      let discountPaise = 0;
      let couponId: string | undefined;
      if (input.couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: input.couponCode.toUpperCase() } });
        const now = new Date();
        if (!coupon || !coupon.isActive || (coupon.startsAt && coupon.startsAt > now) || (coupon.endsAt && coupon.endsAt < now) || (coupon.minimumOrderPaise && subtotal < coupon.minimumOrderPaise)) throw new ValidationError('Coupon is not applicable.', undefined, 'COUPON_INVALID');
        const used = await tx.couponRedemption.count({ where: { couponId: coupon.id } });
        if (coupon.usageLimit && used >= coupon.usageLimit) throw new ValidationError('Coupon usage limit reached.', undefined, 'COUPON_INVALID');
        discountPaise = coupon.discountType === 'PERCENTAGE' ? Math.floor(subtotal * coupon.discountValue / 100) : coupon.discountValue;
        if (coupon.maximumDiscountPaise) discountPaise = Math.min(discountPaise, coupon.maximumDiscountPaise);
        couponId = coupon.id;
      }
      const shippingChargePaise = shippingFee(subtotal - discountPaise, input.deliveryOptionId);
      const totalPaise = Math.max(0, subtotal - discountPaise + shippingChargePaise);
      const order = await tx.order.create({ data: { orderNumber: orderNumber(), userId, shippingAddress: snapshot, subtotalPaise: subtotal, discountPaise, shippingChargePaise, totalPaise, items: { create: lines.map(line => ({ variantId: line.variantId, productName: line.variant.product.name, sku: line.variant.sku, size: line.variant.size, colorName: line.variant.colorName, unitPricePaise: line.variant.priceOverridePaise ?? line.variant.product.basePricePaise, quantity: line.quantity, lineTotalPaise: (line.variant.priceOverridePaise ?? line.variant.product.basePricePaise) * line.quantity })) } } });
      for (const line of lines) {
        const changed = await tx.$executeRaw`UPDATE "product_variants" SET "stock_quantity" = "stock_quantity" - ${line.quantity} WHERE "id" = ${line.variantId}::uuid AND "status" = 'ACTIVE' AND "stock_quantity" >= ${line.quantity}`;
        if (changed !== 1) throw new ValidationError('One or more products are no longer available.', undefined, 'INSUFFICIENT_STOCK');
        await tx.inventoryReservation.create({ data: { orderId: order.id, variantId: line.variantId, quantity: line.quantity, expiresAt: new Date(Date.now() + 15 * 60 * 1000) } });
      }
      if (couponId) await tx.couponRedemption.create({ data: { couponId, userId, orderId: order.id } });
      const payment = await tx.payment.create({ data: { orderId: order.id, provider: 'PHONEPE', method: 'UPI', amountPaise: totalPaise, idempotencyKey, expiresAt: new Date(Date.now() + 15 * 60 * 1000) } });
      logger.info({ orderId: order.id, paymentId: payment.id }, 'Checkout created and inventory reserved.');
      return { order, payment };
    });
    return this.initiate(userId, result.payment.id);
  }

  async initiate(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, order: { userId } }, include: { order: true } });
    if (!payment) throw new NotFoundError('Payment was not found.', 'PAYMENT_NOT_FOUND');
    if (payment.status === 'SUCCESS' || payment.status === 'PAID') return this.paymentSession(payment.id, payment.status, payment.orderId);
    if (payment.expiresAt && payment.expiresAt <= new Date()) return this.complete(userId, paymentId, 'EXPIRED');
    if (!['PENDING', 'INITIATED'].includes(payment.status)) throw new ConflictError('This payment cannot be retried.', 'PAYMENT_NOT_PAYABLE');
    const initiated = await paymentProvider().initiate({ paymentId: payment.id, amountPaise: payment.amountPaise, orderNumber: payment.order.orderNumber });
    await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'INITIATED', providerReference: initiated.providerReference } });
    logger.info({ orderId: payment.orderId, paymentId: payment.id, providerReference: initiated.providerReference }, 'Payment initiated.');
    return { paymentId: payment.id, orderId: payment.orderId, paymentStatus: 'INITIATED', redirectUrl: initiated.redirectUrl };
  }

  async complete(userId: string, paymentId: string, result: 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED') {
    const outcome = await this.prisma.$transaction(async tx => {
      const payment = await tx.payment.findFirst({ where: { id: paymentId, order: { userId } }, include: { order: true } });
      if (!payment) throw new NotFoundError('Payment was not found.', 'PAYMENT_NOT_FOUND');
      if (payment.status === 'SUCCESS' || payment.status === 'PAID') return payment;
      if (!['PENDING', 'INITIATED'].includes(payment.status)) return payment;
      const update = await tx.payment.updateMany({ where: { id: payment.id, status: { in: ['PENDING', 'INITIATED'] } }, data: { status: result } });
      if (!update.count) return tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
      if (result === 'SUCCESS') {
        await tx.order.update({ where: { id: payment.orderId }, data: { status: 'CONFIRMED', paymentStatus: 'SUCCESS' } });
        await tx.inventoryReservation.updateMany({ where: { orderId: payment.orderId, status: 'ACTIVE' }, data: { status: 'CONSUMED' } });
        await tx.cartItem.deleteMany({ where: { cart: { userId } } });
        logger.info({ orderId: payment.orderId, paymentId }, 'Payment succeeded and order confirmed.');
      } else {
        const active = await tx.inventoryReservation.findMany({ where: { orderId: payment.orderId, status: 'ACTIVE' } });
        const released = await tx.inventoryReservation.updateMany({ where: { orderId: payment.orderId, status: 'ACTIVE' }, data: { status: result === 'EXPIRED' ? 'EXPIRED' : 'RELEASED', releasedAt: new Date() } });
        if (released.count) for (const reservation of active) await tx.productVariant.update({ where: { id: reservation.variantId }, data: { stockQuantity: { increment: reservation.quantity } } });
        await tx.order.update({ where: { id: payment.orderId }, data: { status: 'CANCELLED', paymentStatus: result } });
        logger.info({ orderId: payment.orderId, paymentId, result }, 'Payment did not complete and inventory was released.');
      }
      return tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
    });
    return this.paymentSession(paymentId, outcome.status, outcome.orderId);
  }

  async paymentStatus(userId: string, paymentId: string) { const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, order: { userId } } }); if (!payment) throw new NotFoundError('Payment was not found.', 'PAYMENT_NOT_FOUND'); return this.paymentSession(payment.id, payment.status, payment.orderId); }
  async orders(userId: string) { return this.prisma.order.findMany({ where: { userId }, include: orderInclude, orderBy: { createdAt: 'desc' } }); }
  async order(userId: string, orderId: string) { const order = await this.prisma.order.findFirst({ where: { id: orderId, userId }, include: orderInclude }); if (!order) throw new NotFoundError('Order was not found.', 'ORDER_NOT_FOUND'); return order; }
  async cancel(userId: string, orderId: string) { const order = await this.order(userId, orderId); const payment = order.payments[0]; if (!payment || !['PENDING', 'INITIATED'].includes(payment.status)) throw new ConflictError('This order cannot be cancelled.', 'ORDER_NOT_CANCELLABLE'); return this.complete(userId, payment.id, 'CANCELLED'); }
  private paymentSession(paymentId: string, paymentStatus: string, orderId: string) { return { paymentId, orderId, paymentStatus, redirectUrl: paymentStatus === 'INITIATED' ? `${process.env.FRONTEND_URL ?? 'http://localhost:5174'}/checkout/payment?paymentId=${paymentId}` : undefined }; }
}
