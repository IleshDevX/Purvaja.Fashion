import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { getPrismaClient } from '../../src/config/database.js';
import { CSRF_COOKIE } from '../../src/utils/auth.js';
import { sanitizeAuditMetadata } from '../../src/utils/audit.js';
import { CommerceService } from '../../src/services/commerce.service.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';

const prisma = getPrismaClient();

describe('Phase 4: Review Integrity & Audit Reliability', () => {
  const createdUserIds: string[] = [];
  const createdOrderIds: string[] = [];
  let testProduct: { id: string; slug: string; name: string };
  let testVariant: { id: string; sku: string; size: string; colorName: string };

  beforeAll(async () => {
    // Find an active product with a variant
    const product = await prisma.product.findFirstOrThrow({
      where: {
        status: 'ACTIVE',
        variants: { some: { status: 'ACTIVE' } },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        variants: {
          where: { status: 'ACTIVE' },
          select: { id: true, sku: true, size: true, colorName: true },
          take: 1,
        },
      },
    });

    testProduct = { id: product.id, slug: product.slug, name: product.name };
    testVariant = product.variants[0]!;
  });

  afterAll(async () => {
    if (createdOrderIds.length) {
      await prisma.auditLog.deleteMany({ where: { entityId: { in: createdOrderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    }
    if (createdUserIds.length) {
      await prisma.review.deleteMany({ where: { userId: { in: createdUserIds } } });
      const stats = await prisma.review.aggregate({
        where: { productId: testProduct.id, status: 'PUBLISHED' },
        _avg: { rating: true },
        _count: true,
      });
      await prisma.product.update({
        where: { id: testProduct.id },
        data: { rating: stats._avg.rating ?? 0, reviewCount: stats._count },
      });
      await prisma.auditLog.deleteMany({ where: { actorId: { in: createdUserIds } } });
      await prisma.session.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  async function createTestUser(role: 'CUSTOMER' | 'ADMIN' = 'CUSTOMER') {
    const email = `review-test-${randomUUID()}@example.invalid`;
    const password = 'SecurePassword123!';
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await argon2.hash(password),
        firstName: 'Test',
        lastName: 'Reviewer',
        emailVerifiedAt: new Date(),
        role,
      },
    });
    createdUserIds.push(user.id);

    const agent = request.agent(app);
    const loginRes = await agent.post('/api/v1/auth/login').send({ email, password });
    const csrf = (loginRes.headers['set-cookie'] as unknown as string[])
      .find(value => value.startsWith(`${CSRF_COOKIE}=`))!
      .split(';')[0]!
      .split('=')[1]!;

    return { user, agent, csrf };
  }

  async function createOrder(
    userId: string,
    status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED',
    includeProduct = true,
  ) {
    const order = await prisma.order.create({
      data: {
        orderNumber: `PF-REV-${randomUUID().slice(0, 8).toUpperCase()}`,
        userId,
        shippingAddress: {
          recipientName: 'Reviewer',
          phone: '9999999999',
          line1: '1 Fashion Avenue',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'IN',
        },
        subtotalPaise: 299900,
        totalPaise: 299900,
        status,
        paymentStatus: status === 'DELIVERED' ? 'SUCCESS' : 'PENDING',
        items: includeProduct
          ? {
              create: {
                variantId: testVariant.id,
                productName: testProduct.name,
                sku: testVariant.sku,
                size: testVariant.size,
                colorName: testVariant.colorName,
                unitPricePaise: 299900,
                quantity: 1,
                lineTotalPaise: 299900,
              },
            }
          : undefined,
      },
    });
    createdOrderIds.push(order.id);
    return order;
  }

  // 1. Verified-purchase review succeeds for eligible delivered order
  it('1. Verified-purchase review succeeds for eligible delivered order', async () => {
    const { user, agent, csrf } = await createTestUser();
    await createOrder(user.id, 'DELIVERED', true);

    const res = await agent
      .post(`/api/v1/products/${testProduct.id}/reviews`)
      .set('X-CSRF-Token', csrf)
      .send({
        rating: 5,
        title: 'Impeccable Craftsmanship',
        comment: 'The fabric drape and tailoring exceeded all expectations.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rating).toBe(5);
    expect(res.body.data.isVerified).toBe(true);
    expect(res.body.data.title).toBe('Impeccable Craftsmanship');

    const dbReview = await prisma.review.findUnique({
      where: { userId_productId: { userId: user.id, productId: testProduct.id } },
    });
    expect(dbReview).not.toBeNull();
    expect(dbReview!.status).toBe('PUBLISHED');
  });

  // 2. Review is rejected when user did not purchase the product
  it('2. Review is rejected when user did not purchase the product', async () => {
    const { user, agent, csrf } = await createTestUser();
    // User has no orders for this product

    const res = await agent
      .post(`/api/v1/products/${testProduct.id}/reviews`)
      .set('X-CSRF-Token', csrf)
      .send({
        rating: 5,
        title: 'Never Bought This',
        comment: 'Trying to review a product I never purchased.',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('VERIFIED_PURCHASE_REQUIRED');

    const dbReview = await prisma.review.findUnique({
      where: { userId_productId: { userId: user.id, productId: testProduct.id } },
    });
    expect(dbReview).toBeNull();
  });

  // 3. Review is rejected when order is not delivered
  it('3. Review is rejected when order is not delivered', async () => {
    const { user, agent, csrf } = await createTestUser();
    // Order exists but is in CONFIRMED / SHIPPED state, not DELIVERED
    await createOrder(user.id, 'CONFIRMED', true);

    const res = await agent
      .post(`/api/v1/products/${testProduct.id}/reviews`)
      .set('X-CSRF-Token', csrf)
      .send({
        rating: 4,
        title: 'Not Delivered Yet',
        comment: 'Trying to review before receiving package.',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ORDER_NOT_DELIVERED');

    const dbReview = await prisma.review.findUnique({
      where: { userId_productId: { userId: user.id, productId: testProduct.id } },
    });
    expect(dbReview).toBeNull();
  });

  // 4. Review cannot be created for another user\'s order
  it('4. Review cannot be created for another user\'s order', async () => {
    const userA = await createTestUser();
    const orderA = await createOrder(userA.user.id, 'DELIVERED', true);

    const userB = await createTestUser();

    const res = await userB.agent
      .post(`/api/v1/products/${testProduct.id}/reviews`)
      .set('X-CSRF-Token', userB.csrf)
      .send({
        rating: 5,
        title: 'Fraudulent Claim',
        comment: 'Attempting to piggyback on another user\'s order ID.',
        orderId: orderA.id,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ORDER_FORBIDDEN');

    const dbReview = await prisma.review.findUnique({
      where: { userId_productId: { userId: userB.user.id, productId: testProduct.id } },
    });
    expect(dbReview).toBeNull();
  });

  // 5. Duplicate review is rejected
  it('5. Duplicate review is rejected', async () => {
    const { user, agent, csrf } = await createTestUser();
    await createOrder(user.id, 'DELIVERED', true);

    // First review succeeds
    const first = await agent
      .post(`/api/v1/products/${testProduct.id}/reviews`)
      .set('X-CSRF-Token', csrf)
      .send({
        rating: 5,
        title: 'First Review',
        comment: 'First legitimate review.',
      });
    expect(first.status).toBe(201);

    // Second review for same product is rejected
    const second = await agent
      .post(`/api/v1/products/${testProduct.id}/reviews`)
      .set('X-CSRF-Token', csrf)
      .send({
        rating: 4,
        title: 'Second Review Attempt',
        comment: 'Attempting a duplicate review for the same product.',
      });

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('DUPLICATE_REVIEW');
  });

  // 6. Concurrent duplicate review submissions → exactly one succeeds
  it('6. Concurrent duplicate review submissions → exactly one succeeds', async () => {
    const { user, agent, csrf } = await createTestUser();
    await createOrder(user.id, 'DELIVERED', true);

    const [res1, res2] = await Promise.all([
      agent
        .post(`/api/v1/products/${testProduct.id}/reviews`)
        .set('X-CSRF-Token', csrf)
        .send({
          rating: 5,
          title: 'Concurrent Race 1',
          comment: 'Concurrent attempt one.',
        }),
      agent
        .post(`/api/v1/products/${testProduct.id}/reviews`)
        .set('X-CSRF-Token', csrf)
        .send({
          rating: 5,
          title: 'Concurrent Race 2',
          comment: 'Concurrent attempt two.',
        }),
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);

    const reviews = await prisma.review.findMany({
      where: { userId: user.id, productId: testProduct.id },
    });
    expect(reviews).toHaveLength(1);
  });

  // 7. Verification status cannot be forged by frontend input
  it('7. Verification status cannot be forged by frontend input', async () => {
    const unverifiedUser = await createTestUser();

    // Client without purchase passes isVerified: true -> still rejected by server
    const forgedAttempt = await unverifiedUser.agent
      .post(`/api/v1/products/${testProduct.id}/reviews`)
      .set('X-CSRF-Token', unverifiedUser.csrf)
      .send({
        rating: 5,
        title: 'Forged Verification',
        comment: 'Attempting to bypass verified purchase check via client payload.',
        isVerified: true,
      });

    expect(forgedAttempt.status).toBe(403);
    expect(forgedAttempt.body.error.code).toBe('VERIFIED_PURCHASE_REQUIRED');

    // Legitimate purchaser passes isVerified: false -> server still derives true
    const legitimateUser = await createTestUser();
    await createOrder(legitimateUser.user.id, 'DELIVERED', true);

    const legitimateAttempt = await legitimateUser.agent
      .post(`/api/v1/products/${testProduct.id}/reviews`)
      .set('X-CSRF-Token', legitimateUser.csrf)
      .send({
        rating: 5,
        title: 'Authentic Customer',
        comment: 'Legitimate purchaser payload passing isVerified false.',
        isVerified: false,
      });

    expect(legitimateAttempt.status).toBe(201);
    expect(legitimateAttempt.body.data.isVerified).toBe(true);
  });

  // 8. Review cache is invalidated after mutation
  it('8. Review cache is invalidated after mutation', async () => {
    const { user, agent, csrf } = await createTestUser();
    await createOrder(user.id, 'DELIVERED', true);

    // Query reviews to populate cache
    const initialGet = await request(app).get(`/api/v1/products/${testProduct.slug}/reviews`);
    expect(initialGet.status).toBe(200);
    const initialCount = initialGet.body.data.total;

    // Create a new review
    const uniqueComment = `Cache test review unique string ${randomUUID()}`;
    const createRes = await agent
      .post(`/api/v1/products/${testProduct.id}/reviews`)
      .set('X-CSRF-Token', csrf)
      .send({
        rating: 5,
        title: 'Cache Invalidation Check',
        comment: uniqueComment,
      });
    expect(createRes.status).toBe(201);

    // Subsequent read must return the freshly created review
    const subsequentGet = await request(app).get(`/api/v1/products/${testProduct.slug}/reviews`);
    expect(subsequentGet.status).toBe(200);
    expect(subsequentGet.body.data.total).toBe(initialCount + 1);
    const found = subsequentGet.body.data.items.some(
      (item: { comment: string }) => item.comment === uniqueComment,
    );
    expect(found).toBe(true);
  });

  // 9. Critical operation does not silently succeed when audit persistence fails
  it('9. Critical operation does not silently succeed when audit persistence fails', async () => {
    const { user } = await createTestUser();
    const order = await createOrder(user.id, 'DELIVERED', true);

    // Custom Prisma client proxy that fails auditLog.create inside transaction without mutating the global singleton
    const mockPrisma = new Proxy(prisma, {
      get(target, prop, receiver) {
        if (prop === '$transaction') {
          return async <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
            return (target.$transaction as (cb: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T>)(
              async (tx: Prisma.TransactionClient) => {
                const txProxy = new Proxy(tx, {
                  get(txTarget, txProp) {
                    if (txProp === 'auditLog') {
                      return {
                        ...txTarget.auditLog,
                        create: () => Promise.reject(new Error('Audit DB persistence failure')),
                      };
                    }
                    return Reflect.get(txTarget, txProp);
                  },
                });
                return fn(txProxy as unknown as Prisma.TransactionClient);
              },
            );
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });

    const commerceService = new CommerceService(mockPrisma as unknown as PrismaClient);

    await expect(
      commerceService.requestReturn(user.id, order.id, 'Faulty audit test'),
    ).rejects.toThrow('Audit DB persistence failure');

    // Verify order status was NOT changed due to transactional rollback
    const reloaded = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(reloaded.status).toBe('DELIVERED');
  });

  // 10. Audit record contains correct actor/entity/action metadata
  it('10. Audit record contains correct actor/entity/action metadata', async () => {
    const { user, agent, csrf } = await createTestUser();
    const order = await createOrder(user.id, 'DELIVERED', true);

    const returnRes = await agent
      .post(`/api/v1/orders/${order.id}/returns`)
      .set('X-CSRF-Token', csrf)
      .send({
        reason: 'Incorrect fit across shoulders',
      });
    expect(returnRes.status).toBe(200);

    const audit = await prisma.auditLog.findFirst({
      where: {
        entityId: order.id,
        action: 'ORDER_RETURN_REQUESTED',
      },
    });

    expect(audit).not.toBeNull();
    expect(audit!.actorId).toBe(user.id);
    expect(audit!.entityType).toBe('order');
    expect(audit!.action).toBe('ORDER_RETURN_REQUESTED');
    expect((audit!.metadata as Record<string, unknown>).reason).toBe('Incorrect fit across shoulders');
  });

  // 11. Audit records do not contain secrets/tokens/passwords
  it('11. Audit records do not contain secrets/tokens/passwords', async () => {
    const rawMetadata = {
      orderId: 'test-order-id',
      userEmail: 'customer@example.com',
      password: 'UserPlainTextPassword123',
      sessionToken: 'raw_session_token_xyz',
      providerSecret: 'phonepe_secret_key_123',
      authorization: 'Bearer super_secret_jwt',
      nested: {
        tokenHash: 'sha256_hash_value',
        cookie: 'session_cookie_value',
      },
    };

    const sanitized = sanitizeAuditMetadata(rawMetadata);

    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.sessionToken).toBe('[REDACTED]');
    expect(sanitized.providerSecret).toBe('[REDACTED]');
    expect(sanitized.authorization).toBe('[REDACTED]');
    expect(sanitized.nested.tokenHash).toBe('[REDACTED]');
    expect(sanitized.nested.cookie).toBe('[REDACTED]');
    expect(sanitized.orderId).toBe('test-order-id');
    expect(sanitized.userEmail).toBe('customer@example.com');
  });
});
