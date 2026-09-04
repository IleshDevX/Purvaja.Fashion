import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { getPrismaClient } from '../../src/config/database.js';
import { CSRF_COOKIE } from '../../src/utils/auth.js';

const prisma = getPrismaClient();
const email = `checkout-${randomUUID()}@example.invalid`;
let userId = ''; let variantId = ''; let paymentId = ''; let orderId = '';
const address = { recipientName: 'Checkout Tester', phone: '9999999999', line1: '1 Test Road', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'IN' };
let agent: ReturnType<typeof request.agent>; let csrf = '';

beforeAll(async () => {
  const variant = await prisma.productVariant.findFirstOrThrow({ where: { status: 'ACTIVE', stockQuantity: { gte: 2 }, product: { status: 'ACTIVE' } } }); variantId = variant.id;
  const user = await prisma.user.create({ data: { email, passwordHash: await argon2.hash('SecurePassword123'), emailVerifiedAt: new Date() } }); userId = user.id;
  agent = request.agent(app); const login = await agent.post('/api/v1/auth/login').send({ email, password: 'SecurePassword123' });
  csrf = (login.headers['set-cookie'] as unknown as string[]).find(value => value.startsWith(`${CSRF_COOKIE}=`))!.split(';')[0]!.split('=')[1]!;
});
afterAll(async () => { if (userId) { await prisma.inventoryReservation.deleteMany({ where: { order: { userId } } }); await prisma.payment.deleteMany({ where: { order: { userId } } }); await prisma.orderItem.deleteMany({ where: { order: { userId } } }); await prisma.order.deleteMany({ where: { userId } }); await prisma.cart.deleteMany({ where: { userId } }); await prisma.session.deleteMany({ where: { userId } }); await prisma.user.delete({ where: { id: userId } }); } });

describe('UPI checkout', () => {
  it('rejects unauthenticated and empty-cart checkout requests', async () => {
    expect((await request(app).post('/api/v1/checkout').send({ shippingAddress: address })).status).toBe(401);
    expect((await agent.post('/api/v1/checkout').set('X-CSRF-Token', csrf).send({ shippingAddress: address })).status).toBe(400);
  });
  it('creates a server-priced order, reservation, and pending demo payment', async () => {
    await agent.post('/api/v1/cart/items').set('X-CSRF-Token', csrf).send({ variantId, quantity: 1 }).expect(200);
    const response = await agent.post('/api/v1/checkout').set('X-CSRF-Token', csrf).set('Idempotency-Key', randomUUID()).send({ shippingAddress: address, deliveryOptionId: 'standard' });
    expect(response.status).toBe(200); expect(response.body.data.redirectUrl).toContain('/checkout/payment?paymentId=');
    ({ paymentId, orderId } = response.body.data); const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(payment.amountPaise).toBeGreaterThan(0); expect(payment.status).toBe('INITIATED');
    expect(await prisma.inventoryReservation.count({ where: { orderId, status: 'ACTIVE' } })).toBe(1);
  });
  it('enforces payment ownership and makes repeated success idempotent', async () => {
    const stranger = request.agent(app); const strangerEmail = `stranger-${randomUUID()}@example.invalid`; await prisma.user.create({ data: { email: strangerEmail, passwordHash: await argon2.hash('SecurePassword123') } });
    const login = await stranger.post('/api/v1/auth/login').send({ email: strangerEmail, password: 'SecurePassword123' }); const strangerCsrf = (login.headers['set-cookie'] as unknown as string[]).find(value => value.startsWith(`${CSRF_COOKIE}=`))!.split(';')[0]!.split('=')[1]!;
    expect((await stranger.post(`/api/v1/payments/${paymentId}/demo-result`).set('X-CSRF-Token', strangerCsrf).send({ result: 'SUCCESS' })).status).toBe(404);
    const [first, duplicate] = await Promise.all([agent.post(`/api/v1/payments/${paymentId}/demo-result`).set('X-CSRF-Token', csrf).send({ result: 'SUCCESS' }), agent.post(`/api/v1/payments/${paymentId}/demo-result`).set('X-CSRF-Token', csrf).send({ result: 'SUCCESS' })]);
    expect(first.status).toBe(200); expect(duplicate.status).toBe(200);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } })).status).toBe('SUCCESS');
    expect(await prisma.inventoryReservation.count({ where: { orderId, status: 'CONSUMED' } })).toBe(1);
    const strangerUser = await prisma.user.findUniqueOrThrow({ where: { email: strangerEmail } }); await prisma.session.deleteMany({ where: { userId: strangerUser.id } }); await prisma.user.delete({ where: { id: strangerUser.id } });
  });
});
