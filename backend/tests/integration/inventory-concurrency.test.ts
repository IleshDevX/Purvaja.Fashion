import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { getPrismaClient } from '../../src/config/database.js';
import { CSRF_COOKIE } from '../../src/utils/auth.js';
import { CommerceService } from '../../src/services/commerce.service.js';
import { AdminService } from '../../src/services/admin.service.js';

const prisma = getPrismaClient();
const commerceService = new CommerceService();
const adminService = new AdminService();

const password = 'SecurePassword123!';
const userAEmail = `inv-user-a-${randomUUID()}@example.invalid`;
const userBEmail = `inv-user-b-${randomUUID()}@example.invalid`;
const adminEmail = `inv-admin-${randomUUID()}@example.invalid`;

let userAId = '';
let userBId = '';
let adminId = '';

let agentA: ReturnType<typeof request.agent>;
let agentB: ReturnType<typeof request.agent>;

let csrfA = '';
let csrfB = '';

let testProductId = '';
let testVariantId = '';
let secondaryVariantId = '';

const shippingAddress = {
  recipientName: 'Inventory Tester',
  phone: '9876543210',
  line1: '123 Concurrency Way',
  city: 'Surat',
  state: 'Gujarat',
  postalCode: '395006',
  country: 'IN',
};

beforeAll(async () => {
  // 1. Create test users
  const [userA, userB, admin] = await Promise.all([
    prisma.user.create({
      data: { email: userAEmail, passwordHash: await argon2.hash(password), emailVerifiedAt: new Date() },
    }),
    prisma.user.create({
      data: { email: userBEmail, passwordHash: await argon2.hash(password), emailVerifiedAt: new Date() },
    }),
    prisma.user.create({
      data: { email: adminEmail, passwordHash: await argon2.hash(password), role: 'ADMIN', emailVerifiedAt: new Date() },
    }),
  ]);
  userAId = userA.id;
  userBId = userB.id;
  adminId = admin.id;

  // 2. Setup supertest agents & login
  agentA = request.agent(app);
  const loginA = await agentA.post('/api/v1/auth/login').send({ email: userAEmail, password });
  csrfA = (loginA.headers['set-cookie'] as unknown as string[])
    .find(c => c.startsWith(`${CSRF_COOKIE}=`))!
    .split(';')[0]!
    .split('=')[1]!;

  agentB = request.agent(app);
  const loginB = await agentB.post('/api/v1/auth/login').send({ email: userBEmail, password });
  csrfB = (loginB.headers['set-cookie'] as unknown as string[])
    .find(c => c.startsWith(`${CSRF_COOKIE}=`))!
    .split(';')[0]!
    .split('=')[1]!;

  // 3. Create isolated test product and variants
  const product = await prisma.product.create({
    data: {
      name: 'Concurrency Test Saree',
      slug: `concurrency-test-${randomUUID()}`,
      description: 'Test product for inventory and coupon concurrency',
      basePricePaise: 150000,
      status: 'ACTIVE',
      variants: {
        create: [
          {
            sku: `INV-SKU-1-${randomUUID().slice(0, 8)}`,
            size: 'Free Size',
            colorName: 'Royal Silk Crimson',
            colorHex: '#990000',
            stockQuantity: 100,
            status: 'ACTIVE',
          },
          {
            sku: `INV-SKU-2-${randomUUID().slice(0, 8)}`,
            size: 'Free Size',
            colorName: 'Royal Emerald Green',
            colorHex: '#006633',
            stockQuantity: 100,
            status: 'ACTIVE',
          },
        ],
      },
    },
    include: { variants: true },
  });
  testProductId = product.id;
  testVariantId = product.variants[0].id;
  secondaryVariantId = product.variants[1].id;
});

afterAll(async () => {
  const userIds = [userAId, userBId, adminId].filter(Boolean);
  const variantIds = [testVariantId, secondaryVariantId].filter(Boolean);

  if (userIds.length > 0 || variantIds.length > 0) {
    // Refunds can reference returns with RESTRICT, so financial children must
    // be removed before return and order fixtures.
    await prisma.paymentRefund.deleteMany({ where: { payment: { order: { userId: { in: userIds } } } } });
    await prisma.orderReturnItem.deleteMany({
      where: {
        OR: [
          { orderItem: { order: { userId: { in: userIds } } } },
          { orderItem: { variantId: { in: variantIds } } },
        ],
      },
    }).catch(() => {});

    await prisma.orderReturn.deleteMany({
      where: {
        OR: [
          { order: { userId: { in: userIds } } },
          { order: { items: { some: { variantId: { in: variantIds } } } } },
        ],
      },
    }).catch(() => {});

    await prisma.couponRedemption.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
    await prisma.checkoutIdempotency.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
    await prisma.inventoryReservation.deleteMany({
      where: {
        OR: [
          { order: { userId: { in: userIds } } },
          { variantId: { in: variantIds } },
        ],
      },
    }).catch(() => {});
    await prisma.paymentObservation.deleteMany({ where: { payment: { order: { userId: { in: userIds } } } } }).catch(() => {});
    await prisma.paymentInitiation.deleteMany({ where: { payment: { order: { userId: { in: userIds } } } } }).catch(() => {});
    await prisma.payment.deleteMany({ where: { order: { userId: { in: userIds } } } }).catch(() => {});
    await prisma.orderItem.deleteMany({
      where: {
        OR: [
          { order: { userId: { in: userIds } } },
          { variantId: { in: variantIds } },
        ],
      },
    }).catch(() => {});
    await prisma.order.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
    await prisma.cartItem.deleteMany({
      where: {
        OR: [
          { cart: { userId: { in: userIds } } },
          { variantId: { in: variantIds } },
        ],
      },
    }).catch(() => {});
    await prisma.cart.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } }).catch(() => {});
  }

  if (variantIds.length > 0) {
    await prisma.inventoryMovement.deleteMany({ where: { variantId: { in: variantIds } } }).catch(() => {});
    await prisma.productVariant.deleteMany({ where: { id: { in: variantIds } } }).catch(() => {});
  }

  if (testProductId) {
    await prisma.product.deleteMany({ where: { id: testProductId } }).catch(() => {});
  }

  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
  }
});

describe('Phase 2: Inventory, Orders, Coupons & Returns Integrity', { timeout: 25000 }, () => {
  // --------------------------------------------------------------------------
  // Scenario 1: Concurrent checkout cannot oversell stock
  // --------------------------------------------------------------------------
  it('1. Concurrent checkout cannot oversell stock', async () => {
    // Set stock to exactly 2
    await prisma.productVariant.update({
      where: { id: testVariantId },
      data: { stockQuantity: 2 },
    });

    // Both User A and User B add 2 units to their cart
    await agentA
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', csrfA)
      .send({ variantId: testVariantId, quantity: 2 });

    await agentB
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', csrfB)
      .send({ variantId: testVariantId, quantity: 2 });

    // Concurrent checkouts requesting 2 units each (total 4 requested, only 2 available)
    const [resA, resB] = await Promise.all([
      agentA
        .post('/api/v1/checkout')
        .set('X-CSRF-Token', csrfA)
        .set('Idempotency-Key', `oversell-a-${randomUUID()}`)
        .send({ shippingAddress }),
      agentB
        .post('/api/v1/checkout')
        .set('X-CSRF-Token', csrfB)
        .set('Idempotency-Key', `oversell-b-${randomUUID()}`)
        .send({ shippingAddress }),
    ]);

    const statuses = [resA.status, resB.status];
    expect(statuses).toContain(200);
    expect(statuses).toContain(400);

    const successfulRes = resA.status === 200 ? resA : resB;
    const failedRes = resA.status === 400 ? resA : resB;

    expect(successfulRes.body.success).toBe(true);
    expect(failedRes.body.error.code).toBe('INSUFFICIENT_STOCK');

    // DB Verification: stock must be exactly 0, NEVER negative
    const variantAfter = await prisma.productVariant.findUniqueOrThrow({
      where: { id: testVariantId },
    });
    expect(variantAfter.stockQuantity).toBe(0);

    // Verify exactly one SALE movement of 2 units was recorded
    const movements = await prisma.inventoryMovement.findMany({
      where: { variantId: testVariantId, type: 'SALE', referenceId: successfulRes.body.data.orderId },
    });
    expect(movements.length).toBe(1);
    expect(movements[0].previousQuantity).toBe(2);
    expect(movements[0].quantity).toBe(2);
    expect(movements[0].resultingQuantity).toBe(0);

    // Clean cart for next tests
    await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: [userAId, userBId] } } } });
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Expired reservation releases stock exactly once
  // --------------------------------------------------------------------------
  it('2. Expired reservation releases stock exactly once', async () => {
    // Set stock to 10
    await prisma.productVariant.update({
      where: { id: testVariantId },
      data: { stockQuantity: 10 },
    });

    // Create an order with reservation directly
    const order = await prisma.order.create({
      data: {
        orderNumber: `PF-EXP-${randomUUID().slice(0, 8)}`,
        userId: userAId,
        shippingAddress,
        subtotalPaise: 450000,
        totalPaise: 450000,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        items: {
          create: {
            variantId: testVariantId,
            productName: 'Concurrency Test Saree',
            sku: 'SKU-EXP-1',
            size: 'Free Size',
            colorName: 'Royal Silk Crimson',
            unitPricePaise: 150000,
            quantity: 3,
            lineTotalPaise: 450000,
          },
        },
      },
    });

    // Variant stock becomes 10 - 3 = 7
    await prisma.productVariant.update({
      where: { id: testVariantId },
      data: { stockQuantity: 7 },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'PHONEPE',
        method: 'UPI',
        amountPaise: 450000,
        status: 'PENDING',
        idempotencyKey: randomUUID(),
      },
    });

    // Expired reservation (expired 5 minutes ago)
    await prisma.inventoryReservation.create({
      data: {
        orderId: order.id,
        variantId: testVariantId,
        quantity: 3,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() - 5 * 60 * 1000),
      },
    });

    // Run releaseExpiredReservations twice concurrently
    const [result1, result2] = await Promise.all([
      commerceService.releaseExpiredReservations(),
      commerceService.releaseExpiredReservations(),
    ]);

    // Total released reservations for this batch
    expect(result1.releasedCount + result2.releasedCount).toBe(1);

    // DB Verification: Stock should be restored by exactly 3, reaching 10 (not 13)
    const variantAfter = await prisma.productVariant.findUniqueOrThrow({
      where: { id: testVariantId },
    });
    expect(variantAfter.stockQuantity).toBe(10);

    // Reservation in DB must be EXPIRED
    const reservation = await prisma.inventoryReservation.findFirstOrThrow({
      where: { orderId: order.id, variantId: testVariantId },
    });
    expect(reservation.status).toBe('EXPIRED');
    expect(reservation.releasedAt).not.toBeNull();

    // Order status must be CANCELLED and paymentStatus EXPIRED
    const orderAfter = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(orderAfter.status).toBe('CANCELLED');
    expect(orderAfter.paymentStatus).toBe('EXPIRED');

    // Exactly one RESTOCK inventory movement recorded
    const movements = await prisma.inventoryMovement.findMany({
      where: { variantId: testVariantId, type: 'RESTOCK', referenceId: order.id },
    });
    expect(movements.length).toBe(1);
    expect(movements[0].previousQuantity).toBe(7);
    expect(movements[0].quantity).toBe(3);
    expect(movements[0].resultingQuantity).toBe(10);
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Payment success racing reservation expiry
  // --------------------------------------------------------------------------
  it('3. Payment success racing reservation expiry', async () => {
    // Set stock to 20
    await prisma.productVariant.update({
      where: { id: testVariantId },
      data: { stockQuantity: 20 },
    });

    // Create an order with reservation and payment
    const order = await prisma.order.create({
      data: {
        orderNumber: `PF-RACE-${randomUUID().slice(0, 8)}`,
        userId: userAId,
        shippingAddress,
        subtotalPaise: 300000,
        totalPaise: 300000,
        status: 'PENDING',
        paymentStatus: 'INITIATED',
        items: {
          create: {
            variantId: testVariantId,
            productName: 'Concurrency Test Saree',
            sku: 'SKU-RACE-1',
            size: 'Free Size',
            colorName: 'Royal Silk Crimson',
            unitPricePaise: 150000,
            quantity: 2,
            lineTotalPaise: 300000,
          },
        },
      },
    });

    // Stock reduced to 18
    await prisma.productVariant.update({
      where: { id: testVariantId },
      data: { stockQuantity: 18 },
    });

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'PHONEPE',
        method: 'UPI',
        amountPaise: 300000,
        status: 'INITIATED',
        idempotencyKey: randomUUID(),
        expiresAt: new Date(Date.now() - 1000), // Technically expired timestamp
      },
    });

    await prisma.inventoryReservation.create({
      data: {
        orderId: order.id,
        variantId: testVariantId,
        quantity: 2,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    // Race payment completion (SUCCESS) with releaseExpiredReservations
    await Promise.allSettled([
      commerceService.complete(userAId, payment.id, 'SUCCESS'),
      commerceService.releaseExpiredReservations(),
    ]);

    // DB Verification: State must be completely consistent
    const orderAfter = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    const paymentAfter = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    const reservationAfter = await prisma.inventoryReservation.findFirstOrThrow({
      where: { orderId: order.id },
    });
    const variantAfter = await prisma.productVariant.findUniqueOrThrow({
      where: { id: testVariantId },
    });

    if (orderAfter.status === 'CONFIRMED') {
      expect(paymentAfter.status).toBe('SUCCESS');
      expect(reservationAfter.status).toBe('CONSUMED');
      expect(variantAfter.stockQuantity).toBe(18);
    } else {
      expect(orderAfter.status).toBe('CANCELLED');
      expect(paymentAfter.status).toBe('EXPIRED');
      expect(reservationAfter.status).toBe('EXPIRED');
      expect(variantAfter.stockQuantity).toBe(20);
    }

    // 2. Explicit check: Successful orders cannot have their stock released by the expiry process
    const successfulOrder = await prisma.order.create({
      data: {
        orderNumber: `PF-SUCCESS-IMMUNE-${randomUUID().slice(0, 8)}`,
        userId: userAId,
        shippingAddress,
        subtotalPaise: 300000,
        totalPaise: 300000,
        status: 'CONFIRMED',
        paymentStatus: 'SUCCESS',
        items: {
          create: {
            variantId: testVariantId,
            productName: 'Concurrency Test Saree',
            sku: 'SKU-SUCCESS-IMMUNE-1',
            size: 'Free Size',
            colorName: 'Royal Silk Crimson',
            unitPricePaise: 150000,
            quantity: 2,
            lineTotalPaise: 300000,
          },
        },
        payments: {
          create: {
            provider: 'PHONEPE',
            method: 'UPI',
            amountPaise: 300000,
            status: 'SUCCESS',
            idempotencyKey: randomUUID(),
          },
        },
        inventoryReservations: {
          create: {
            variantId: testVariantId,
            quantity: 2,
            status: 'CONSUMED',
            expiresAt: new Date(Date.now() - 60000), // In the past
          },
        },
      },
    });

    const stockBeforeExpiry = (await prisma.productVariant.findUniqueOrThrow({ where: { id: testVariantId } })).stockQuantity;

    // Run expiration cleanup
    await commerceService.releaseExpiredReservations();

    // Confirm DB state: successful order was untouched and stock was NOT released
    const orderImmune = await prisma.order.findUniqueOrThrow({ where: { id: successfulOrder.id } });
    const reservationImmune = await prisma.inventoryReservation.findFirstOrThrow({ where: { orderId: successfulOrder.id } });
    const stockAfterExpiry = (await prisma.productVariant.findUniqueOrThrow({ where: { id: testVariantId } })).stockQuantity;

    expect(orderImmune.status).toBe('CONFIRMED');
    expect(orderImmune.paymentStatus).toBe('SUCCESS');
    expect(reservationImmune.status).toBe('CONSUMED');
    expect(stockAfterExpiry).toBe(stockBeforeExpiry);
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Cancellation restores stock exactly once
  // --------------------------------------------------------------------------
  it('4. Cancellation restores stock exactly once', async () => {
    // Initial stock 15
    await prisma.productVariant.update({
      where: { id: testVariantId },
      data: { stockQuantity: 15 },
    });

    // Ensure cart is empty before adding items
    await prisma.cartItem.deleteMany({ where: { cart: { userId: userAId } } });

    await agentA
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', csrfA)
      .send({ variantId: testVariantId, quantity: 4 });

    const checkoutRes = await agentA
      .post('/api/v1/checkout')
      .set('X-CSRF-Token', csrfA)
      .set('Idempotency-Key', `cancel-test-${randomUUID()}`)
      .send({ shippingAddress });

    expect(checkoutRes.status).toBe(200);
    const orderId = checkoutRes.body.data.orderId;

    // Stock should now be 11
    let variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: testVariantId } });
    expect(variant.stockQuantity).toBe(11);

    // Cancel order
    const cancelRes = await agentA
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('X-CSRF-Token', csrfA)
      .send({ reason: 'Customer requested cancellation' });
    expect(cancelRes.status).toBe(200);

    // Stock must be restored to 15
    variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: testVariantId } });
    expect(variant.stockQuantity).toBe(15);

    // Reservation must be RELEASED
    const reservation = await prisma.inventoryReservation.findFirstOrThrow({ where: { orderId } });
    expect(reservation.status).toBe('RELEASED');

    // Order and Payment must be CANCELLED
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId } });
    expect(order.status).toBe('CANCELLED');
    expect(payment.status).toBe('CANCELLED');

    // Check inventory movement
    const cancelMovements = await prisma.inventoryMovement.findMany({
      where: { variantId: testVariantId, type: 'CANCELLATION', referenceId: orderId },
    });
    expect(cancelMovements.length).toBe(1);
    expect(cancelMovements[0].previousQuantity).toBe(11);
    expect(cancelMovements[0].quantity).toBe(4);
    expect(cancelMovements[0].resultingQuantity).toBe(15);
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Concurrent cancellation requests
  // --------------------------------------------------------------------------
  it('5. Concurrent cancellation requests do not double restock', async () => {
    // Initial stock 20
    await prisma.productVariant.update({
      where: { id: testVariantId },
      data: { stockQuantity: 20 },
    });

    // Ensure cart is empty before adding items
    await prisma.cartItem.deleteMany({ where: { cart: { userId: userAId } } });

    await agentA
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', csrfA)
      .send({ variantId: testVariantId, quantity: 5 });

    const checkoutRes = await agentA
      .post('/api/v1/checkout')
      .set('X-CSRF-Token', csrfA)
      .set('Idempotency-Key', `concurrent-cancel-${randomUUID()}`)
      .send({ shippingAddress });

    expect(checkoutRes.status).toBe(200);
    const orderId = checkoutRes.body.data.orderId;

    // Stock reduced to 15
    let variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: testVariantId } });
    expect(variant.stockQuantity).toBe(15);

    // Send two concurrent cancellation requests
    const [cancel1, cancel2] = await Promise.all([
      agentA.post(`/api/v1/orders/${orderId}/cancel`).set('X-CSRF-Token', csrfA).send({ reason: 'Customer requested cancellation' }),
      agentA.post(`/api/v1/orders/${orderId}/cancel`).set('X-CSRF-Token', csrfA).send({ reason: 'Customer requested cancellation' }),
    ]);

    const statuses = [cancel1.status, cancel2.status];
    expect(statuses).toContain(200);
    // The other either gets 409 (ORDER_NOT_CANCELLABLE) or 200 idempotent outcome
    if (statuses.includes(409)) {
      const errRes = cancel1.status === 409 ? cancel1 : cancel2;
      expect(errRes.body.error.code).toBe('ORDER_NOT_CANCELLABLE');
    }

    // Critical check: Stock must be restored to 20, NOT 25!
    variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: testVariantId } });
    expect(variant.stockQuantity).toBe(20);

    // Exactly one CANCELLATION inventory movement recorded
    const cancelMovements = await prisma.inventoryMovement.findMany({
      where: { variantId: testVariantId, type: 'CANCELLATION', referenceId: orderId },
    });
    expect(cancelMovements.length).toBe(1);
    expect(cancelMovements[0].previousQuantity).toBe(15);
    expect(cancelMovements[0].quantity).toBe(5);
    expect(cancelMovements[0].resultingQuantity).toBe(20);
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Return cannot exceed purchased quantity
  // --------------------------------------------------------------------------
  it('6. Return cannot exceed purchased quantity', async () => {
    // Create an order in DELIVERED status with 2 items
    const order = await prisma.order.create({
      data: {
        orderNumber: `PF-RET-${randomUUID().slice(0, 8)}`,
        userId: userAId,
        shippingAddress,
        subtotalPaise: 300000,
        totalPaise: 300000,
        status: 'DELIVERED',
        deliveredAt: new Date(),
        paymentStatus: 'SUCCESS',
        items: {
          create: {
            variantId: testVariantId,
            productName: 'Concurrency Test Saree',
            sku: 'SKU-RET-1',
            size: 'Free Size',
            colorName: 'Royal Silk Crimson',
            unitPricePaise: 150000,
            quantity: 2,
            lineTotalPaise: 300000,
          },
        },
      },
      include: { items: true },
    });

    const orderItemId = order.items[0].id;

    // 1. Attempt to return non-existent item
    const nonExistentItemRes = await agentA
      .post(`/api/v1/orders/${order.id}/returns`)
      .set('X-CSRF-Token', csrfA)
      .send({
        reason: 'Item defective',
        items: [{ orderItemId: randomUUID(), quantity: 1 }],
      });
    expect(nonExistentItemRes.status).toBe(400);
    expect(nonExistentItemRes.body.error.code).toBe('RETURN_ITEM_NOT_FOUND');

    // 2. Attempt to return 5 items when only 2 were purchased
    const excessiveReturnRes = await agentA
      .post(`/api/v1/orders/${order.id}/returns`)
      .set('X-CSRF-Token', csrfA)
      .send({
        reason: 'Too large',
        items: [{ orderItemId, quantity: 5 }],
      });
    expect(excessiveReturnRes.status).toBe(400);
    expect(excessiveReturnRes.body.error.code).toBe('RETURN_QUANTITY_EXCEEDED');

    // 3. Valid return of 2 items
    const validReturnRes = await agentA
      .post(`/api/v1/orders/${order.id}/returns`)
      .set('X-CSRF-Token', csrfA)
      .send({
        reason: 'Color did not match lighting',
        items: [{ orderItemId, quantity: 2 }],
      });
    expect(validReturnRes.status).toBe(200);

    const orderAfter = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(orderAfter.status).toBe('RETURN_REQUESTED');
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Duplicate return cannot restock twice
  // --------------------------------------------------------------------------
  it('7. Duplicate return cannot restock twice', async () => {
    // Current stock
    const currentVariant = await prisma.productVariant.findUniqueOrThrow({ where: { id: testVariantId } });
    const baseStock = currentVariant.stockQuantity;

    // Create a delivered order in RETURN_REQUESTED state
    const order = await prisma.order.create({
      data: {
        orderNumber: `PF-ADM-RET-${randomUUID().slice(0, 8)}`,
        userId: userAId,
        shippingAddress,
        subtotalPaise: 300000,
        totalPaise: 300000,
        status: 'RETURN_REQUESTED',
        deliveredAt: new Date(),
        paymentStatus: 'SUCCESS',
        items: {
          create: {
            variantId: testVariantId,
            productName: 'Concurrency Test Saree',
            sku: 'SKU-ADM-RET-1',
            size: 'Free Size',
            colorName: 'Royal Silk Crimson',
            unitPricePaise: 150000,
            quantity: 2,
            lineTotalPaise: 300000,
          },
        },
      },
    });

    // Admin updates order status to RETURNED
    const updatedOrder = await adminService.updateOrderStatus(adminId, order.id, 'RETURNED');
    expect(updatedOrder.status).toBe('RETURNED');

    // Stock should be baseStock + 2
    let variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: testVariantId } });
    expect(variant.stockQuantity).toBe(baseStock + 2);

    // Exactly one RETURN movement
    let returnMovements = await prisma.inventoryMovement.findMany({
      where: { variantId: testVariantId, type: 'RETURN', referenceId: order.id },
    });
    expect(returnMovements.length).toBe(1);
    expect(returnMovements[0].previousQuantity).toBe(baseStock);
    expect(returnMovements[0].quantity).toBe(2);
    expect(returnMovements[0].resultingQuantity).toBe(baseStock + 2);

    // Second call to update to RETURNED must be rejected
    await expect(
      adminService.updateOrderStatus(adminId, order.id, 'RETURNED'),
    ).rejects.toThrow();

    // Stock in DB must remain baseStock + 2 (NOT baseStock + 4)
    variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: testVariantId } });
    expect(variant.stockQuantity).toBe(baseStock + 2);

    // Return movements must still be exactly 1
    returnMovements = await prisma.inventoryMovement.findMany({
      where: { variantId: testVariantId, type: 'RETURN', referenceId: order.id },
    });
    expect(returnMovements.length).toBe(1);
  });

  // --------------------------------------------------------------------------
  // Scenario 8: Concurrent coupon redemption respects usage limit
  // --------------------------------------------------------------------------
  it('8. Concurrent coupon redemption respects usage limit', async () => {
    // Ensure sufficient stock
    await prisma.productVariant.update({
      where: { id: testVariantId },
      data: { stockQuantity: 50 },
    });

    // Create coupon with usageLimit = 1
    const couponCode = `LMT1_${randomUUID().slice(0, 8).toUpperCase()}`;
    const coupon = await prisma.coupon.create({
      data: {
        code: couponCode,
        discountType: 'FIXED',
        discountValue: 20000,
        usageLimit: 1,
        isActive: true,
      },
    });

    // User A and User B add item to cart
    await agentA
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', csrfA)
      .send({ variantId: testVariantId, quantity: 1 });

    await agentB
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', csrfB)
      .send({ variantId: testVariantId, quantity: 1 });

    // Concurrent checkouts both using the coupon code
    const [resA, resB] = await Promise.all([
      agentA
        .post('/api/v1/checkout')
        .set('X-CSRF-Token', csrfA)
        .set('Idempotency-Key', `coupon-race-a-${randomUUID()}`)
        .send({ shippingAddress, couponCode }),
      agentB
        .post('/api/v1/checkout')
        .set('X-CSRF-Token', csrfB)
        .set('Idempotency-Key', `coupon-race-b-${randomUUID()}`)
        .send({ shippingAddress, couponCode }),
    ]);

    const statuses = [resA.status, resB.status];
    expect(statuses).toContain(200);
    expect(statuses).toContain(400);

    const successfulRes = resA.status === 200 ? resA : resB;
    const failedRes = resA.status === 400 ? resA : resB;

    expect(successfulRes.body.success).toBe(true);
    expect(failedRes.body.error.code).toBe('COUPON_LIMIT_REACHED');

    // DB Verification: Exactly 1 redemption in coupon_redemptions table
    const redemptions = await prisma.couponRedemption.findMany({
      where: { couponId: coupon.id },
    });
    expect(redemptions.length).toBe(1);

    // Clean cart
    await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: [userAId, userBId] } } } });
  });

  // --------------------------------------------------------------------------
  // Scenario 9: Same user cannot exceed per-user coupon limit
  // --------------------------------------------------------------------------
  it('9. Same user cannot exceed per-user coupon limit', async () => {
    // Ensure stock
    await prisma.productVariant.update({
      where: { id: testVariantId },
      data: { stockQuantity: 50 },
    });

    // Create coupon with generous total limit but 1 per user
    const couponCode = `PERUSER_${randomUUID().slice(0, 8).toUpperCase()}`;
    const coupon = await prisma.coupon.create({
      data: {
        code: couponCode,
        discountType: 'FIXED',
        discountValue: 10000,
        usageLimit: 100,
        isActive: true,
      },
    });

    // 1. User A first checkout with coupon -> succeeds
    await agentA
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', csrfA)
      .send({ variantId: testVariantId, quantity: 1 });

    const firstCheckout = await agentA
      .post('/api/v1/checkout')
      .set('X-CSRF-Token', csrfA)
      .set('Idempotency-Key', `per-user-1-${randomUUID()}`)
      .send({ shippingAddress, couponCode });

    expect(firstCheckout.status).toBe(200);

    // 2. User A second checkout with same coupon -> rejected
    await agentA
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', csrfA)
      .send({ variantId: testVariantId, quantity: 1 });

    const secondCheckout = await agentA
      .post('/api/v1/checkout')
      .set('X-CSRF-Token', csrfA)
      .set('Idempotency-Key', `per-user-2-${randomUUID()}`)
      .send({ shippingAddress, couponCode });

    expect(secondCheckout.status).toBe(400);
    expect(secondCheckout.body.error.code).toBe('COUPON_ALREADY_USED');

    // DB Verification: Exactly 1 redemption for User A
    const userARedemptions = await prisma.couponRedemption.count({
      where: { couponId: coupon.id, userId: userAId },
    });
    expect(userARedemptions).toBe(1);

    // Clean cart
    await prisma.cartItem.deleteMany({ where: { cart: { userId: userAId } } });
  });

  // --------------------------------------------------------------------------
  // Scenario 10: Failed payment does not permanently consume coupon usage
  // --------------------------------------------------------------------------
  it('10. Failed payment does not permanently consume coupon usage', async () => {
    await prisma.productVariant.update({
      where: { id: testVariantId },
      data: { stockQuantity: 50 },
    });

    const couponCode = `FAILSAFE_${randomUUID().slice(0, 8).toUpperCase()}`;
    const coupon = await prisma.coupon.create({
      data: {
        code: couponCode,
        discountType: 'FIXED',
        discountValue: 15000,
        usageLimit: 1,
        isActive: true,
      },
    });

    // User A checks out with coupon
    await agentA
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', csrfA)
      .send({ variantId: testVariantId, quantity: 1 });

    const checkoutRes = await agentA
      .post('/api/v1/checkout')
      .set('X-CSRF-Token', csrfA)
      .set('Idempotency-Key', `failsafe-1-${randomUUID()}`)
      .send({ shippingAddress, couponCode });

    expect(checkoutRes.status).toBe(200);
    const { paymentId } = checkoutRes.body.data;

    // Verify redemption exists while payment is pending
    let redemptionCount = await prisma.couponRedemption.count({ where: { couponId: coupon.id } });
    expect(redemptionCount).toBe(1);

    // Simulate payment failure
    await commerceService.complete(userAId, paymentId, 'FAILED');

    // DB Verification: Coupon redemption must be deleted on payment failure
    redemptionCount = await prisma.couponRedemption.count({ where: { couponId: coupon.id } });
    expect(redemptionCount).toBe(0);

    // Now User B should be able to redeem this single-use coupon!
    await agentB
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', csrfB)
      .send({ variantId: testVariantId, quantity: 1 });

    const userBCheckout = await agentB
      .post('/api/v1/checkout')
      .set('X-CSRF-Token', csrfB)
      .set('Idempotency-Key', `failsafe-retry-b-${randomUUID()}`)
      .send({ shippingAddress, couponCode });

    expect(userBCheckout.status).toBe(200);
    expect(userBCheckout.body.success).toBe(true);

    // DB Verification: Coupon now redeemed by User B
    const userBRedemption = await prisma.couponRedemption.findFirstOrThrow({
      where: { couponId: coupon.id },
    });
    expect(userBRedemption.userId).toBe(userBId);

    // Clean cart
    await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: [userAId, userBId] } } } });
  });

  // --------------------------------------------------------------------------
  // Scenario 11: Invalid order/payment/inventory state transitions are rejected
  // --------------------------------------------------------------------------
  it('11. Invalid order/payment/inventory state transitions are rejected', async () => {
    // 1. Order state transition validation
    const confirmedOrder = await prisma.order.create({
      data: {
        orderNumber: `PF-INV-TRANS-${randomUUID().slice(0, 8)}`,
        userId: userAId,
        shippingAddress,
        subtotalPaise: 150000,
        totalPaise: 150000,
        status: 'CONFIRMED',
        paymentStatus: 'SUCCESS',
        payments: {
          create: {
            provider: 'PHONEPE',
            method: 'UPI',
            amountPaise: 150000,
            status: 'SUCCESS',
            idempotencyKey: randomUUID(),
          },
        },
      },
      include: { payments: true },
    });

    // Cannot cancel CONFIRMED order
    const cancelRes = await agentA
      .post(`/api/v1/orders/${confirmedOrder.id}/cancel`)
      .set('X-CSRF-Token', csrfA)
      .send({ reason: 'Attempted cancellation' });
    expect(cancelRes.status).toBe(409);
    expect(cancelRes.body.error.code).toBe('ORDER_NOT_CANCELLABLE');

    // Cannot return CONFIRMED order (must be DELIVERED)
    const returnRes = await agentA
      .post(`/api/v1/orders/${confirmedOrder.id}/returns`)
      .set('X-CSRF-Token', csrfA)
      .send({ reason: 'Premature return' });
    expect(returnRes.status).toBe(409);
    expect(returnRes.body.error.code).toBe('ORDER_NOT_RETURNABLE');

    // 2. Payment state transitions
    const paymentId = confirmedOrder.payments[0].id;

    // Cannot transition payment from SUCCESS to FAILED
    await commerceService.complete(userAId, paymentId, 'FAILED');
    expect(await prisma.paymentObservation.findFirst({
      where: { paymentId, observedState: 'FAILED' },
    })).toMatchObject({ disposition: 'IGNORED' });

    // Create a FAILED payment
    const failedPayment = await prisma.payment.create({
      data: {
        orderId: confirmedOrder.id,
        provider: 'PHONEPE',
        method: 'UPI',
        amountPaise: 150000,
        status: 'FAILED',
        idempotencyKey: randomUUID(),
      },
    });

    // A late capture is financial truth. It is recorded and refunded without
    // replacing the already successful payment that owns this order.
    await commerceService.complete(userAId, failedPayment.id, 'SUCCESS');
    expect(await prisma.paymentRefund.findFirst({ where: { paymentId: failedPayment.id } }))
      .toMatchObject({ reason: 'LATE_CAPTURE', status: 'SUCCEEDED' });
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: failedPayment.id } })).status).toBe('REFUNDED');

    // Verify DB integrity remains intact
    const orderCheck = await prisma.order.findUniqueOrThrow({ where: { id: confirmedOrder.id } });
    expect(orderCheck.status).toBe('CONFIRMED');
    expect(orderCheck.paymentStatus).toBe('SUCCESS');
  });

  // --------------------------------------------------------------------------
  // Scenario 12: Every stock change has correct before/after quantities
  // --------------------------------------------------------------------------
  it('12. Every stock change has correct before/after quantities', async () => {
    // Query all inventory movements created for our test variants
    const movements = await prisma.inventoryMovement.findMany({
      where: { variantId: { in: [testVariantId, secondaryVariantId] } },
    });

    expect(movements.length).toBeGreaterThan(0);

    for (const m of movements) {
      expect(typeof m.previousQuantity).toBe('number');
      expect(typeof m.quantity).toBe('number');
      expect(typeof m.resultingQuantity).toBe('number');
      expect(m.quantity).toBeGreaterThan(0);

      // Verify arithmetic consistency based on movement type
      if (m.type === 'SALE' || m.type === 'DAMAGE') {
        expect(m.previousQuantity - m.quantity).toBe(m.resultingQuantity);
      } else if (m.type === 'RESTOCK' || m.type === 'CANCELLATION' || m.type === 'RETURN') {
        expect(m.previousQuantity + m.quantity).toBe(m.resultingQuantity);
      } else if (m.type === 'CORRECTION' || m.type === 'ADJUSTMENT') {
        // CORRECTION / ADJUSTMENT can be positive or negative
        expect(m.resultingQuantity).toBeGreaterThanOrEqual(0);
      }

      // Verify audit fields
      expect(m.reason).toBeDefined();
      expect(m.referenceType).toBeDefined();
    }
  });
});
