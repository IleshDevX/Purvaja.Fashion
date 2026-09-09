import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { getPrismaClient } from '../../src/config/database.js';
import { AuthService } from '../../src/services/auth.service.js';
import { SESSION_COOKIE, CSRF_COOKIE } from '../../src/utils/auth.js';

const prisma = getPrismaClient();
const users: string[] = [];
const cookies: string[][] = [];
const address = { recipientName: 'Private Owner', phone: '9876543210', line1: 'Private Road', city: 'Surat', state: 'Gujarat', postalCode: '395006', country: 'IN' };
let addressId = '';
let orderId = '';
let paymentId = '';
beforeAll(async () => {
  for (const role of ['CUSTOMER', 'CUSTOMER', 'ADMIN'] as const) {
    const user = await prisma.user.create({ data: { email: `ownership-${randomUUID()}@example.invalid`, passwordHash: 'unused', role } });
    users.push(user.id);
    const session = await new AuthService().createSession(user.id);
    cookies.push([`${SESSION_COOKIE}=${session.sessionToken}`, `${CSRF_COOKIE}=fixture-csrf`]);
  }
  addressId = (await prisma.address.create({ data: { ...address, userId: users[0]! } })).id;
  orderId = (await prisma.order.create({ data: { userId: users[0]!, orderNumber: randomUUID(), subtotalPaise: 10000, totalPaise: 10000, shippingAddress: address } })).id;
  paymentId = (await prisma.payment.create({ data: { orderId, provider: 'PHONEPE', method: 'UPI', amountPaise: 10000, idempotencyKey: randomUUID() } })).id;
});
afterAll(async () => {
  if (paymentId) await prisma.payment.delete({ where: { id: paymentId } });
  if (orderId) await prisma.order.delete({ where: { id: orderId } });
  if (addressId) await prisma.address.delete({ where: { id: addressId } });
  await prisma.session.deleteMany({ where: { userId: { in: users } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
});

it('enforces the anonymous/customer/admin role matrix', async () => {
  const path = '/api/v1/admin/dashboard';
  expect((await request(app).get(path)).status).toBe(401);
  expect((await request(app).get(path).set('Cookie', cookies[0]!)).status).toBe(403);
  expect((await request(app).get(path).set('Cookie', cookies[2]!)).status).toBe(200);
});

it('keeps order and payment reads scoped to the owner', async () => {
  for (const path of [`/api/v1/orders/${orderId}`, `/api/v1/payments/${paymentId}/status`]) {
    expect((await request(app).get(path)).status).toBe(401);
    expect((await request(app).get(path).set('Cookie', cookies[1]!)).status).toBe(404);
    expect((await request(app).get(path).set('Cookie', cookies[0]!)).status).toBe(200);
  }
});

it('rejects cross-user address writes and order cancellation without changing data', async () => {
  expect((await request(app).patch(`/api/v1/addresses/${addressId}`).set('Cookie', cookies[1]!).set('X-CSRF-Token', 'fixture-csrf').send({ ...address, line1: 'Attacker Road' })).status).toBe(404);
  expect((await request(app).delete(`/api/v1/addresses/${addressId}`).set('Cookie', cookies[1]!).set('X-CSRF-Token', 'fixture-csrf')).status).toBe(404);
  expect((await request(app).post(`/api/v1/orders/${orderId}/cancel`).set('Cookie', cookies[1]!).set('X-CSRF-Token', 'fixture-csrf').send({ reason: 'Unauthorized cancellation' })).status).toBe(404);
  expect((await prisma.address.findUniqueOrThrow({ where: { id: addressId } })).line1).toBe('Private Road');
  expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe('PENDING');
});
