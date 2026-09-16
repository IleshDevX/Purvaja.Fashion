import { createHmac, randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { getPrismaClient } from '../../src/config/database.js';
import { CSRF_COOKIE } from '../../src/utils/auth.js';

const prisma = getPrismaClient();
const secret = 'isolated-test-shipping-webhook-secret-at-least-32';
const password = 'SecurePassword123';
let adminId = '';
let customerId = '';
let orderId = '';
let trackingNumber = '';
let adminAgent: ReturnType<typeof request.agent>;
let csrf = '';

function signedWebhook(payload: object, eventId: string) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const body = JSON.stringify(payload);
  const signature = createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest('hex');
  return request(app)
    .post('/api/v1/webhooks/shipping')
    .set('Content-Type', 'application/json')
    .set('X-Shipping-Signature', `sha256=${signature}`)
    .set('X-Shipping-Timestamp', timestamp)
    .set('X-Shipping-Event-Id', eventId)
    .set('X-Shipping-Provider', 'demo')
    .send(body);
}

beforeAll(async () => {
  const [admin, customer] = await Promise.all([
    prisma.user.create({ data: { email: `shipping-admin-${randomUUID()}@example.invalid`, passwordHash: await argon2.hash(password), emailVerifiedAt: new Date(), role: 'ADMIN' } }),
    prisma.user.create({ data: { email: `shipping-customer-${randomUUID()}@example.invalid`, passwordHash: await argon2.hash(password), emailVerifiedAt: new Date() } }),
  ]);
  adminId = admin.id;
  customerId = customer.id;
  const order = await prisma.order.create({
    data: {
      orderNumber: `PF-SHIP-${randomUUID().slice(0, 8).toUpperCase()}`,
      userId: customer.id,
      shippingAddress: { recipientName: 'Shipping Tester', phone: '9999999999', line1: '1 Test Road', city: 'Pune', state: 'Maharashtra', postalCode: '411001', country: 'IN' },
      subtotalPaise: 10000,
      totalPaise: 10000,
      status: 'PROCESSING',
      paymentStatus: 'SUCCESS',
    },
  });
  orderId = order.id;
  adminAgent = request.agent(app);
  const login = await adminAgent.post('/api/v1/auth/login').send({ email: admin.email, password });
  csrf = (login.headers['set-cookie'] as unknown as string[])
    .find(value => value.startsWith(`${CSRF_COOKIE}=`))!.split(';')[0]!.split('=')[1]!;
});

afterAll(async () => {
  if (orderId) {
    await prisma.shipmentWebhookEvent.deleteMany({ where: { shipment: { orderId } } });
    await prisma.orderShipment.deleteMany({ where: { orderId } });
    await prisma.auditLog.deleteMany({ where: { entityId: orderId } });
    await prisma.order.delete({ where: { id: orderId } });
  }
  await prisma.session.deleteMany({ where: { userId: adminId } });
  await prisma.user.deleteMany({ where: { id: { in: [adminId, customerId] } } });
});

describe('shipping security and state machine', () => {
  it('rejects an unsigned public webhook', async () => {
    const response = await request(app).post('/api/v1/webhooks/shipping').send({ trackingNumber: 'unknown', status: 'DELIVERED' });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('SHIPPING_WEBHOOK_UNAUTHORIZED');
  });

  it('prevents generic admin status mutation from bypassing shipment creation', async () => {
    const response = await adminAgent.patch(`/api/v1/admin/orders/${orderId}/status`)
      .set('X-CSRF-Token', csrf).send({ status: 'SHIPPED' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ORDER_TRANSITION');
  });

  it('creates one explicitly simulated shipment through the dedicated workflow', async () => {
    const first = await adminAgent.post(`/api/v1/admin/orders/${orderId}/ship`)
      .set('X-CSRF-Token', csrf).send({});
    expect(first.status).toBe(200);
    expect(first.body.data.shipment.trackingNumber).toMatch(/^DEMO-/);
    expect(first.body.data.shipment.details).toMatchObject({ providerMode: 'demo', simulated: true });
    trackingNumber = first.body.data.shipment.trackingNumber;

    const second = await adminAgent.post(`/api/v1/admin/orders/${orderId}/ship`)
      .set('X-CSRF-Token', csrf).send({});
    expect(second.status).toBe(400);
    expect(await prisma.orderShipment.count({ where: { orderId } })).toBe(1);
  });

  it('processes signed events idempotently and rejects conflicting replay', async () => {
    const payload = { trackingNumber, status: 'IN_TRANSIT' };
    const first = await signedWebhook(payload, 'event-in-transit');
    expect(first.status).toBe(200);
    expect(first.body.data.status).toBe('processed');
    const duplicate = await signedWebhook(payload, 'event-in-transit');
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.data.status).toBe('duplicate');
    const conflict = await signedWebhook({ trackingNumber, status: 'RETURNED' }, 'event-in-transit');
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe('WEBHOOK_EVENT_CONFLICT');
  });

  it('rejects backward transitions and records the rejected event', async () => {
    expect((await signedWebhook({ trackingNumber, status: 'OUT_FOR_DELIVERY' }, 'event-out')).status).toBe(200);
    const backward = await signedWebhook({ trackingNumber, status: 'IN_TRANSIT' }, 'event-backward');
    expect(backward.status).toBe(409);
    expect(backward.body.error.code).toBe('INVALID_SHIPMENT_TRANSITION');
    expect(await prisma.shipmentWebhookEvent.count({ where: { externalEventId: 'event-backward', status: 'REJECTED' } })).toBe(1);
  });

  it('sets immutable delivery time only after a valid signed delivery event', async () => {
    const delivered = await signedWebhook({ trackingNumber, status: 'DELIVERED' }, 'event-delivered');
    expect(delivered.status).toBe(200);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe('DELIVERED');
    expect(order.deliveredAt).not.toBeNull();
    const firstDeliveredAt = order.deliveredAt!.getTime();
    expect((await signedWebhook({ trackingNumber, status: 'DELIVERED' }, 'event-delivered-repeat')).status).toBe(200);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).deliveredAt!.getTime()).toBe(firstDeliveredAt);
  });
});
