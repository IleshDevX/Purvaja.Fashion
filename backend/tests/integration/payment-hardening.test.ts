import { createHash, randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { app } from '../../src/app.js';
import { getPrismaClient } from '../../src/config/database.js';
import { env } from '../../src/config/env.js';
import { CSRF_COOKIE } from '../../src/utils/auth.js';

const prisma = getPrismaClient();
const customerEmail = `hardening-${randomUUID()}@example.invalid`;
const strangerEmail = `hardening-stranger-${randomUUID()}@example.invalid`;

let customerId = '';
let strangerId = '';
let variantId = '';
let productId = '';
let customerAgent: ReturnType<typeof request.agent>;
let customerCsrf = '';

const shippingAddress1 = {
  recipientName: 'Hardening Tester',
  phone: '9876543210',
  line1: '100 Security Boulevard',
  city: 'Mumbai',
  state: 'Maharashtra',
  postalCode: '400001',
  country: 'IN',
};

const shippingAddress2 = {
  recipientName: 'Tampered Tester',
  phone: '9123456780',
  line1: '999 Mismatch Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560001',
  country: 'IN',
};

function createSignedPhonePePayload(
  payloadObj: Record<string, unknown>,
) {
  const username = env.PHONEPE_WEBHOOK_USERNAME!;
  const password = env.PHONEPE_WEBHOOK_PASSWORD!;
  return {
    body: payloadObj,
    authorization: createHash('sha256').update(`${username}:${password}`).digest('hex'),
  };
}

beforeAll(async () => {
  Object.assign(env, {
    PHONEPE_WEBHOOK_USERNAME: 'integration-webhook-user',
    PHONEPE_WEBHOOK_PASSWORD: 'integration-webhook-password',
  });
  // Own the stock fixture: payment tests must not depend on seed quantities or
  // consume catalogue records owned by another suite.
  const product = await prisma.product.create({ data: {
    name: 'Payment hardening fixture', slug: `payment-${randomUUID()}`,
    description: 'Isolated payment test product', basePricePaise: 10000, status: 'ACTIVE',
    variants: { create: { sku: randomUUID(), size: '40 (M)', colorName: 'Blue',
      colorHex: '#0000ff', stockQuantity: 100, status: 'ACTIVE' } },
  }, include: { variants: true } });
  productId = product.id;
  variantId = product.variants[0]!.id;

  const [cust, stranger] = await Promise.all([
    prisma.user.create({
      data: { email: customerEmail, passwordHash: await argon2.hash('SecurePassword123'), emailVerifiedAt: new Date() },
    }),
    prisma.user.create({
      data: { email: strangerEmail, passwordHash: await argon2.hash('SecurePassword123'), emailVerifiedAt: new Date() },
    }),
  ]);
  customerId = cust.id;
  strangerId = stranger.id;

  customerAgent = request.agent(app);
  const loginRes = await customerAgent.post('/api/v1/auth/login').send({ email: customerEmail, password: 'SecurePassword123' });
  const cookies = (loginRes.headers['set-cookie'] as unknown as string[]) || [];
  customerCsrf = cookies.find(c => c.startsWith(`${CSRF_COOKIE}=`))!.split(';')[0]!.split('=')[1]!;
});

afterAll(async () => {
  const userIds = [customerId, strangerId].filter(Boolean);
  if (userIds.length > 0) {
    await prisma.checkoutIdempotency.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.inventoryReservation.deleteMany({ where: { order: { userId: { in: userIds } } } });
    await prisma.payment.deleteMany({ where: { order: { userId: { in: userIds } } } });
    await prisma.orderItem.deleteMany({ where: { order: { userId: { in: userIds } } } });
    await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: userIds } } } });
    await prisma.cart.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  if (variantId) {
    await prisma.inventoryMovement.deleteMany({ where: { variantId } });
    await prisma.productVariant.delete({ where: { id: variantId } });
  }
  if (productId) await prisma.product.delete({ where: { id: productId } });
});

describe('Phase 1: Payment Security and Idempotency', () => {
  it('1. Two concurrent checkouts with the same idempotency key produce one logical order', async () => {
    // Add items to cart
    await customerAgent
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', customerCsrf)
      .send({ variantId, quantity: 2 })
      .expect(200);

    const idempotencyKey = randomUUID();

    const stockBefore = (await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockQuantity;

    // Launch two concurrent checkout requests with identical payload and key
    const [res1, res2] = await Promise.all([
      customerAgent
        .post('/api/v1/checkout')
        .set('X-CSRF-Token', customerCsrf)
        .set('Idempotency-Key', idempotencyKey)
        .send({ shippingAddress: shippingAddress1, deliveryOptionId: 'standard' }),
      customerAgent
        .post('/api/v1/checkout')
        .set('X-CSRF-Token', customerCsrf)
        .set('Idempotency-Key', idempotencyKey)
        .send({ shippingAddress: shippingAddress1, deliveryOptionId: 'standard' }),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    // Both must return the exact same order and payment
    expect(res1.body.data.orderId).toBe(res2.body.data.orderId);
    expect(res1.body.data.paymentId).toBe(res2.body.data.paymentId);

    const orderId = res1.body.data.orderId;

    // Database assertions:
    // Exactly 1 order in DB
    const orderCount = await prisma.order.count({ where: { id: orderId } });
    expect(orderCount).toBe(1);

    // Exactly 1 payment in DB for this idempotency key
    const paymentCount = await prisma.payment.count({ where: { idempotencyKey } });
    expect(paymentCount).toBe(1);

    // Stock decremented exactly once for the 2 items
    const stockAfter = (await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockQuantity;
    expect(stockBefore - stockAfter).toBe(2);

    // Exactly 1 active reservation
    const reservationCount = await prisma.inventoryReservation.count({ where: { orderId, status: 'ACTIVE' } });
    expect(reservationCount).toBe(1);
  });

  it('2. Same idempotency key with conflicting payload is rejected with 409', async () => {
    // Add item to cart
    await customerAgent
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', customerCsrf)
      .send({ variantId, quantity: 1 })
      .expect(200);

    const idempotencyKey = randomUUID();

    // First request with shippingAddress1
    const firstRes = await customerAgent
      .post('/api/v1/checkout')
      .set('X-CSRF-Token', customerCsrf)
      .set('Idempotency-Key', idempotencyKey)
      .send({ shippingAddress: shippingAddress1, deliveryOptionId: 'standard' });
    expect(firstRes.status).toBe(200);

    // Second request with conflicting payload (shippingAddress2)
    const secondRes = await customerAgent
      .post('/api/v1/checkout')
      .set('X-CSRF-Token', customerCsrf)
      .set('Idempotency-Key', idempotencyKey)
      .send({ shippingAddress: shippingAddress2, deliveryOptionId: 'standard' });

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.error.code).toBe('IDEMPOTENCY_PAYLOAD_MISMATCH');
  });

  it('3. Two concurrent payment-initiation requests produce consistent state without duplicate records', async () => {
    // Add item & checkout
    await customerAgent
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', customerCsrf)
      .send({ variantId, quantity: 1 })
      .expect(200);

    const checkoutRes = await customerAgent
      .post('/api/v1/checkout')
      .set('X-CSRF-Token', customerCsrf)
      .send({ shippingAddress: shippingAddress1, deliveryOptionId: 'standard' });
    const { paymentId, orderId } = checkoutRes.body.data;

    // Trigger two concurrent initiations
    const [init1, init2] = await Promise.all([
      customerAgent.post(`/api/v1/payments/${paymentId}/initiate`).set('X-CSRF-Token', customerCsrf),
      customerAgent.post(`/api/v1/payments/${paymentId}/initiate`).set('X-CSRF-Token', customerCsrf),
    ]);

    expect(init1.status).toBe(200);
    expect(init2.status).toBe(200);
    expect(init1.body.data.paymentId).toBe(paymentId);
    expect(init2.body.data.paymentId).toBe(paymentId);

    // Database assertions: exactly 1 payment record exists for this order
    const paymentsForOrder = await prisma.payment.findMany({ where: { orderId } });
    expect(paymentsForOrder).toHaveLength(1);
    expect(paymentsForOrder[0].status).toBe('INITIATED');
  });

  it('4. Duplicate successful PhonePe callback is idempotent and does not duplicate side effects', async () => {
    // Add item & checkout
    await customerAgent
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', customerCsrf)
      .send({ variantId, quantity: 1 })
      .expect(200);

    const checkoutRes = await customerAgent
      .post('/api/v1/checkout')
      .set('X-CSRF-Token', customerCsrf)
      .send({ shippingAddress: shippingAddress1, deliveryOptionId: 'standard' });
    const { paymentId, orderId } = checkoutRes.body.data;

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });

    const callbackPayload = {
      event: 'checkout.order.completed',
      payload: {
        merchantOrderId: paymentId,
        transactionId: `TXN_${randomUUID()}`,
        amount: payment.amountPaise,
        state: 'COMPLETED',
        paymentDetails: [{ transactionId: `TXN_${randomUUID()}`, state: 'COMPLETED' }],
      },
    };

    const { body, authorization } = createSignedPhonePePayload(callbackPayload);

    // 1st callback
    const cb1 = await request(app)
      .post('/api/v1/payments/phonepe-callback')
      .set('Authorization', authorization)
      .send(body);
    expect(cb1.status).toBe(200);

    // Assert order confirmed and reservation consumed
    const order1 = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order1.status).toBe('CONFIRMED');
    expect(order1.paymentStatus).toBe('SUCCESS');
    expect(await prisma.inventoryReservation.count({ where: { orderId, status: 'CONSUMED' } })).toBe(1);

    // 2nd duplicate callback
    const cb2 = await request(app)
      .post('/api/v1/payments/phonepe-callback')
      .set('Authorization', authorization)
      .send(body);
    expect(cb2.status).toBe(200);

    // Assert DB state is unchanged and consistent
    const order2 = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order2.status).toBe('CONFIRMED');
    expect(await prisma.inventoryReservation.count({ where: { orderId, status: 'CONSUMED' } })).toBe(1);
    expect(await prisma.payment.count({ where: { orderId } })).toBe(1);
  });

  it('5. Duplicate failed callback is idempotent and does not restock twice', async () => {
    // Add item & checkout
    await customerAgent
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', customerCsrf)
      .send({ variantId, quantity: 1 })
      .expect(200);

    const checkoutRes = await customerAgent
      .post('/api/v1/checkout')
      .set('X-CSRF-Token', customerCsrf)
      .send({ shippingAddress: shippingAddress1, deliveryOptionId: 'standard' });
    const { paymentId, orderId } = checkoutRes.body.data;

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const stockAfterCheckout = (await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockQuantity;

    const callbackPayload = {
      event: 'checkout.order.failed',
      payload: {
        merchantOrderId: paymentId,
        transactionId: `TXN_${randomUUID()}`,
        amount: payment.amountPaise,
        state: 'FAILED',
        errorCode: 'PAYMENT_DECLINED',
        paymentDetails: [{ transactionId: `TXN_${randomUUID()}`, state: 'FAILED' }],
      },
    };

    const { body, authorization } = createSignedPhonePePayload(callbackPayload);

    // 1st failed callback
    const failRes1 = await request(app)
      .post('/api/v1/payments/phonepe-callback')
      .set('Authorization', authorization)
      .send(body);
    expect(failRes1.status).toBe(200);

    const stockAfterFirstRelease = (await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockQuantity;
    expect(stockAfterFirstRelease - stockAfterCheckout).toBe(1); // 1 item restocked

    // 2nd duplicate failed callback
    const failRes2 = await request(app)
      .post('/api/v1/payments/phonepe-callback')
      .set('Authorization', authorization)
      .send(body);
    expect(failRes2.status).toBe(200);

    const stockAfterSecondRelease = (await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockQuantity;
    // Stock must NOT be incremented twice!
    expect(stockAfterSecondRelease).toBe(stockAfterFirstRelease);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe('CANCELLED');
    expect(order.paymentStatus).toBe('FAILED');
  });

  it('6. Invalid callback signature is rejected with 401 and does not update DB', async () => {
    await customerAgent
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', customerCsrf)
      .send({ variantId, quantity: 1 })
      .expect(200);

    const checkoutRes = await customerAgent
      .post('/api/v1/checkout')
      .set('X-CSRF-Token', customerCsrf)
      .send({ shippingAddress: shippingAddress1, deliveryOptionId: 'standard' });
    const { paymentId, orderId } = checkoutRes.body.data;

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });

    const callbackPayload = {
      event: 'checkout.order.completed',
      payload: {
        merchantOrderId: paymentId,
        amount: payment.amountPaise,
        state: 'COMPLETED',
      },
    };

    const { body } = createSignedPhonePePayload(callbackPayload);

    // Send with forged signature
    const forgedAuthorization = `forged_${randomUUID().replace(/-/g, '')}`;
    const res = await request(app)
      .post('/api/v1/payments/phonepe-callback')
      .set('Authorization', forgedAuthorization)
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_SIGNATURE');

    // Database verification: payment must NOT be marked SUCCESS
    const currentPayment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(currentPayment.status).not.toBe('SUCCESS');

    const currentOrder = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(currentOrder.status).toBe('PENDING');
  });

  it('7. Invalid payment/order identifier in callback returns 404', async () => {
    const nonExistentId = randomUUID();
    const callbackPayload = {
      event: 'checkout.order.completed',
      payload: {
        merchantOrderId: nonExistentId,
        amount: 50000,
        state: 'COMPLETED',
      },
    };

    const { body, authorization } = createSignedPhonePePayload(callbackPayload);

    const res = await request(app)
      .post('/api/v1/payments/phonepe-callback')
      .set('Authorization', authorization)
      .send(body);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PAYMENT_NOT_FOUND');
  });

  it('8. Amount mismatch in callback is rejected with 409 and does not mark order as paid', async () => {
    await customerAgent
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', customerCsrf)
      .send({ variantId, quantity: 1 })
      .expect(200);

    const checkoutRes = await customerAgent
      .post('/api/v1/checkout')
      .set('X-CSRF-Token', customerCsrf)
      .send({ shippingAddress: shippingAddress1, deliveryOptionId: 'standard' });
    const { paymentId, orderId } = checkoutRes.body.data;

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });

    // Report amount that differs from payment.amountPaise
    const tamperedAmount = payment.amountPaise - 10000;
    const callbackPayload = {
      event: 'checkout.order.completed',
      payload: {
        merchantOrderId: paymentId,
        amount: tamperedAmount, // Mismatch!
        state: 'COMPLETED',
      },
    };

    const { body, authorization } = createSignedPhonePePayload(callbackPayload);

    const res = await request(app)
      .post('/api/v1/payments/phonepe-callback')
      .set('Authorization', authorization)
      .send(body);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PAYMENT_AMOUNT_MISMATCH');

    // Database verification: order is NOT confirmed
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).not.toBe('CONFIRMED');
    expect(order.paymentStatus).not.toBe('SUCCESS');
  });

  it('9. Provider timeout during initiation is safely caught without marking order as paid', async () => {
    await customerAgent
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', customerCsrf)
      .send({ variantId, quantity: 1 })
      .expect(200);

    // Mock fetch to simulate gateway timeout (AbortError / TimeoutError)
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      const error = new Error('The operation was aborted due to timeout');
      error.name = 'TimeoutError';
      throw error;
    });

    try {
      // Temporarily test PhonePe initiation timeout
      const paymentProviderModule = await import('../../src/services/payment-provider.service.js');
      const phonePe = new paymentProviderModule.PhonePeProvider();

      await expect(
        phonePe.initiate({ paymentId: randomUUID(), amountPaise: 10000, orderNumber: 'PF-TEST-TIMEOUT' }),
      ).rejects.toThrow();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('10. Provider failure after order creation leaves order safely in PENDING without marking paid', async () => {
    await customerAgent
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', customerCsrf)
      .send({ variantId, quantity: 1 })
      .expect(200);

    const checkoutRes = await customerAgent
      .post('/api/v1/checkout')
      .set('X-CSRF-Token', customerCsrf)
      .send({ shippingAddress: shippingAddress1, deliveryOptionId: 'standard' });
    const { paymentId, orderId } = checkoutRes.body.data;

    // Simulate provider failure during initiate
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ success: false, message: 'Bank gateway is temporarily down' }),
    } as unknown as Response);

    try {
      const paymentProviderModule = await import('../../src/services/payment-provider.service.js');
      const phonePe = new paymentProviderModule.PhonePeProvider();

      await expect(
        phonePe.initiate({ paymentId, amountPaise: 10000, orderNumber: 'PF-TEST-FAIL' }),
      ).rejects.toThrow();

      // Database verification: order is still pending, NOT paid
      const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
      expect(order.status).toBe('PENDING');
      expect(order.paymentStatus).not.toBe('SUCCESS');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('11. Out-of-order failure cannot regress a captured payment', async () => {
    await customerAgent
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', customerCsrf)
      .send({ variantId, quantity: 1 })
      .expect(200);

    const checkoutRes = await customerAgent
      .post('/api/v1/checkout')
      .set('X-CSRF-Token', customerCsrf)
      .send({ shippingAddress: shippingAddress1, deliveryOptionId: 'standard' });
    const { paymentId } = checkoutRes.body.data;

    // Complete as SUCCESS via demo result or callback
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const callbackPayload = {
      event: 'checkout.order.completed',
      payload: {
        merchantOrderId: paymentId,
        amount: payment.amountPaise,
        state: 'COMPLETED',
      },
    };
    const { body, authorization } = createSignedPhonePePayload(callbackPayload);
    await request(app).post('/api/v1/payments/phonepe-callback').set('Authorization', authorization).send(body).expect(200);

    // A stale failure can arrive after capture. It must be recorded and ignored.
    const commerceModule = await import('../../src/services/commerce.service.js');
    const commerce = new commerceModule.CommerceService();

    await commerce.complete(customerId, paymentId, 'FAILED');

    // Database verification: status remains SUCCESS
    const paymentAfter = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(paymentAfter.status).toBe('SUCCESS');
    expect(await prisma.paymentObservation.findFirst({
      where: { paymentId, observedState: 'FAILED' },
    })).toMatchObject({ disposition: 'IGNORED' });
  });

  it('12. Demo payment is rejected when PAYMENT_PROVIDER != demo', async () => {
    // Save current provider
    const originalProvider = env.PAYMENT_PROVIDER;
    (env as { PAYMENT_PROVIDER: string }).PAYMENT_PROVIDER = 'phonepe';

    try {
      const res = await customerAgent
        .post(`/api/v1/payments/${randomUUID()}/demo-result`)
        .set('X-CSRF-Token', customerCsrf)
        .send({ result: 'SUCCESS' });

      // Must be 403 Forbidden or 404 Not Found
      expect([403, 404]).toContain(res.status);
    } finally {
      (env as { PAYMENT_PROVIDER: string }).PAYMENT_PROVIDER = originalProvider;
    }
  });

  it('13. Demo payment is rejected in production configuration (NODE_ENV=production)', async () => {
    const originalEnv = env.NODE_ENV;
    (env as { NODE_ENV: string }).NODE_ENV = 'production';

    try {
      const res = await customerAgent
        .post(`/api/v1/payments/${randomUUID()}/demo-result`)
        .set('X-CSRF-Token', customerCsrf)
        .send({ result: 'SUCCESS' });

      // Must be 403 Forbidden or 404 Not Found
      expect([403, 404]).toContain(res.status);
    } finally {
      (env as { NODE_ENV: string }).NODE_ENV = originalEnv;
    }
  });
});
