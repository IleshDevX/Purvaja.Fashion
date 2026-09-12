import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { getPrismaClient } from '../../src/config/database.js';
import { CSRF_COOKIE } from '../../src/utils/auth.js';

const prisma = getPrismaClient();
const email = `review-return-${randomUUID()}@example.invalid`;
let userId = '';
let productId = '';
let orderId = '';
let expiredOrderId = '';
let agent: ReturnType<typeof request.agent>;
let csrf = '';

beforeAll(async () => {
  const product = await prisma.product.findFirstOrThrow({
    where: { status: 'ACTIVE' },
    select: { id: true, slug: true },
  });
  productId = product.id;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await argon2.hash('SecurePassword123'),
      emailVerifiedAt: new Date(),
    },
  });
  userId = user.id;

  agent = request.agent(app);
  const login = await agent.post('/api/v1/auth/login').send({ email, password: 'SecurePassword123' });
  csrf = (login.headers['set-cookie'] as unknown as string[])
    .find(value => value.startsWith(`${CSRF_COOKIE}=`))!
    .split(';')[0]!
    .split('=')[1]!;

  const variant = await prisma.productVariant.findFirstOrThrow({
    where: { productId },
  });

  // Create a delivered order for return testing
  const order = await prisma.order.create({
    data: {
      orderNumber: `PF-TEST-RET-${randomUUID().slice(0, 8).toUpperCase()}`,
      userId,
      shippingAddress: {
        recipientName: 'Tester',
        phone: '9999999999',
        line1: '1 Test St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'IN',
      },
      subtotalPaise: 299900,
      totalPaise: 299900,
      status: 'DELIVERED',
      deliveredAt: new Date(),
      paymentStatus: 'SUCCESS',
      items: {
        create: {
          variantId: variant.id,
          productName: 'Royal Oxford Shirt',
          sku: variant.sku,
          size: variant.size,
          colorName: variant.colorName,
          unitPricePaise: 299900,
          quantity: 1,
          lineTotalPaise: 299900,
        },
      },
    },
  });
  orderId = order.id;
});

afterAll(async () => {
  if (userId) {
    await prisma.review.deleteMany({ where: { userId } }).catch(() => {});
    const stats = await prisma.review.aggregate({
      where: { productId, status: 'PUBLISHED' },
      _avg: { rating: true },
      _count: true,
    });
    await prisma.product.update({
      where: { id: productId },
      data: { rating: stats._avg.rating ?? 0, reviewCount: stats._count },
    });
    await prisma.auditLog.deleteMany({ where: { actorId: userId } }).catch(() => {});
    await prisma.orderReturnItem.deleteMany({ where: { returnRequest: { orderId } } }).catch(() => {});
    await prisma.orderReturn.deleteMany({ where: { orderId } }).catch(() => {});
    await prisma.orderItem.deleteMany({ where: { orderId } }).catch(() => {});
    await prisma.order.deleteMany({ where: { id: orderId } }).catch(() => {});
    await prisma.order.deleteMany({ where: { id: expiredOrderId } }).catch(() => {});
    await prisma.session.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  }
});

describe('Product Review & Order Return APIs', () => {
  it('allows an authenticated user to submit a 5-star product review and recalculates rating', async () => {
    const response = await agent
      .post(`/api/v1/products/${productId}/reviews`)
      .set('X-CSRF-Token', csrf)
      .send({
        rating: 5,
        title: 'Outstanding Tailoring',
        comment: 'The quality of the stitch and fabric is second to none. Truly luxury.',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.rating).toBe(5);
    expect(response.body.data.title).toBe('Outstanding Tailoring');
    expect(response.body.data.comment).toContain('Truly luxury');

    // Duplicate review check
    const duplicate = await agent
      .post(`/api/v1/products/${productId}/reviews`)
      .set('X-CSRF-Token', csrf)
      .send({
        rating: 4,
        comment: 'Second review attempt should fail.',
      });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('DUPLICATE_REVIEW');
  });

  it('allows customer to request return on a DELIVERED order', async () => {
    const response = await agent
      .post(`/api/v1/orders/${orderId}/returns`)
      .set('X-CSRF-Token', csrf)
      .send({
        reason: 'Sleeve length too long — requesting exchange.',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('RETURN_REQUESTED');

    const updated = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(updated.status).toBe('RETURN_REQUESTED');
  });

  it('rejects returns after seven days using the delivery timestamp', async () => {
    const variant = await prisma.productVariant.findFirstOrThrow({ where: { productId } });
    const expired = await prisma.order.create({
      data: {
        orderNumber: `PF-EXPIRED-${randomUUID().slice(0, 8)}`,
        userId,
        shippingAddress: { recipientName: 'Test Customer', phone: '9999999999', line1: '1 Test Road', city: 'Mumbai', state: 'Maharashtra', postalCode: '400001', country: 'IN' },
        subtotalPaise: 299900,
        totalPaise: 299900,
        status: 'DELIVERED',
        deliveredAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        paymentStatus: 'SUCCESS',
        items: { create: { variantId: variant.id, productName: 'Expired Return Shirt', sku: variant.sku, size: variant.size, colorName: variant.colorName, unitPricePaise: 299900, quantity: 1, lineTotalPaise: 299900 } },
      },
    });
    expiredOrderId = expired.id;
    await prisma.order.update({ where: { id: expired.id }, data: { updatedAt: new Date() } });
    const detail = await agent.get(`/api/v1/orders/${expired.id}`);
    expect(detail.body.data.availableActions.canReturn).toBe(false);
    await expect(prisma.order.update({ where: { id: expired.id }, data: { deliveredAt: new Date() } }))
      .rejects.toThrow(/immutable/);

    const response = await agent
      .post(`/api/v1/orders/${expired.id}/returns`)
      .set('X-CSRF-Token', csrf)
      .send({ reason: 'Outside the return window.' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('RETURN_WINDOW_EXPIRED');
  });
});
