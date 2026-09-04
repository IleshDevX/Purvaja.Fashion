import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { getPrismaClient } from '../../src/config/database.js';
import { CSRF_COOKIE } from '../../src/utils/auth.js';

const prisma = getPrismaClient();
const customerEmail = `payment-flow-${randomUUID()}@example.invalid`;
const strangerEmail = `payment-stranger-${randomUUID()}@example.invalid`;
let customerId = '';
let strangerId = '';
let variantId = '';
let customerAgent: ReturnType<typeof request.agent>;
let strangerAgent: ReturnType<typeof request.agent>;
let customerCsrf = '';

const shippingAddress = {
  recipientName: 'Flow Tester',
  phone: '9876543210',
  line1: '124 Atelier Lane',
  city: 'Mumbai',
  state: 'Maharashtra',
  postalCode: '400001',
  country: 'IN',
};

beforeAll(async () => {
  const variant = await prisma.productVariant.findFirstOrThrow({
    where: { status: 'ACTIVE', stockQuantity: { gte: 5 }, product: { status: 'ACTIVE' } },
  });
  variantId = variant.id;

  const [cust, stranger] = await Promise.all([
    prisma.user.create({ data: { email: customerEmail, passwordHash: await argon2.hash('SecurePassword123'), emailVerifiedAt: new Date() } }),
    prisma.user.create({ data: { email: strangerEmail, passwordHash: await argon2.hash('SecurePassword123'), emailVerifiedAt: new Date() } }),
  ]);
  customerId = cust.id;
  strangerId = stranger.id;

  customerAgent = request.agent(app);
  const loginRes = await customerAgent.post('/api/v1/auth/login').send({ email: customerEmail, password: 'SecurePassword123' });
  const cookies = (loginRes.headers['set-cookie'] as unknown as string[]) || [];
  customerCsrf = cookies.find(c => c.startsWith(`${CSRF_COOKIE}=`))!.split(';')[0]!.split('=')[1]!;

  strangerAgent = request.agent(app);
  await strangerAgent.post('/api/v1/auth/login').send({ email: strangerEmail, password: 'SecurePassword123' });
});

afterAll(async () => {
  const userIds = [customerId, strangerId].filter(Boolean);
  if (userIds.length > 0) {
    await prisma.inventoryReservation.deleteMany({ where: { order: { userId: { in: userIds } } } });
    await prisma.payment.deleteMany({ where: { order: { userId: { in: userIds } } } });
    await prisma.orderItem.deleteMany({ where: { order: { userId: { in: userIds } } } });
    await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: userIds } } } });
    await prisma.cart.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
});

describe('payment and order lifecycle', () => {
  it('handles failed demo payment: marks payment FAILED, releases reservations, and cancels order', async () => {
    // 1. Add item to cart
    await customerAgent
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', customerCsrf)
      .send({ variantId, quantity: 1 })
      .expect(200);

    // 2. Checkout
    const checkoutRes = await customerAgent
      .post('/api/v1/checkout')
      .set('X-CSRF-Token', customerCsrf)
      .send({ shippingAddress, deliveryOptionId: 'standard' });
    expect(checkoutRes.status).toBe(200);
    const { orderId, paymentId } = checkoutRes.body.data;

    // Verify hold exists
    expect(await prisma.inventoryReservation.count({ where: { orderId, status: 'ACTIVE' } })).toBe(1);

    // 3. Mark payment as FAILED
    const failRes = await customerAgent
      .post(`/api/v1/payments/${paymentId}/demo-result`)
      .set('X-CSRF-Token', customerCsrf)
      .send({ result: 'FAILED' });
    expect(failRes.status).toBe(200);

    // 4. Assert payment failed, reservations released, and order cancelled
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(payment.status).toBe('FAILED');
    expect(await prisma.inventoryReservation.count({ where: { orderId, status: 'RELEASED' } })).toBe(1);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe('CANCELLED');
  });

  it('handles successful demo payment: marks payment SUCCESS, consumes reservation, and confirms order', async () => {
    // 1. Add item to cart
    await customerAgent
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', customerCsrf)
      .send({ variantId, quantity: 1 })
      .expect(200);

    // 2. Checkout
    const checkoutRes = await customerAgent
      .post('/api/v1/checkout')
      .set('X-CSRF-Token', customerCsrf)
      .send({ shippingAddress, deliveryOptionId: 'standard' });
    expect(checkoutRes.status).toBe(200);
    const { orderId, paymentId } = checkoutRes.body.data;

    // 3. Check payment status endpoint
    const statusRes = await customerAgent.get(`/api/v1/payments/${paymentId}/status`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.paymentStatus).toBe('INITIATED');

    // 4. Mark payment as SUCCESS
    const successRes = await customerAgent
      .post(`/api/v1/payments/${paymentId}/demo-result`)
      .set('X-CSRF-Token', customerCsrf)
      .send({ result: 'SUCCESS' });
    expect(successRes.status).toBe(200);

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(payment.status).toBe('SUCCESS');
    expect(await prisma.inventoryReservation.count({ where: { orderId, status: 'CONSUMED' } })).toBe(1);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe('CONFIRMED');

    // 5. Query customer order history
    const historyRes = await customerAgent.get('/api/v1/orders');
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: orderId,
          status: 'CONFIRMED',
          paymentStatus: 'SUCCESS',
        }),
      ]),
    );

    // 6. Query specific order details
    const orderDetailRes = await customerAgent.get(`/api/v1/orders/${orderId}`);
    expect(orderDetailRes.status).toBe(200);
    expect(orderDetailRes.body.data).toMatchObject({
      id: orderId,
      status: 'CONFIRMED',
      items: expect.any(Array),
      shippingAddress: expect.objectContaining({ recipientName: 'Flow Tester' }),
    });

    // 7. Enforce stranger customer cannot view this order
    const strangerOrderRes = await strangerAgent.get(`/api/v1/orders/${orderId}`);
    expect(strangerOrderRes.status).toBe(404);

    // 8. Enforce that an already-paid order cannot be cancelled directly by customer (returns 409 ORDER_NOT_CANCELLABLE)
    const cancelRes = await customerAgent
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('X-CSRF-Token', customerCsrf)
      .send({ reason: 'Customer changed mind' });
    expect(cancelRes.status).toBe(409);
    expect(cancelRes.body.error.code).toBe('ORDER_NOT_CANCELLABLE');
  });
});
