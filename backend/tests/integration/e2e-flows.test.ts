import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { getPrismaClient } from '../../src/config/database.js';
import { CSRF_COOKIE } from '../../src/utils/auth.js';

const prisma = getPrismaClient();

describe('Phase 8 E2E Critical Business Flows', () => {
  describe('Customer Journey: Register → Login → Browse → Cart → Checkout → Pay → Order History', () => {
    const customerEmail = `e2e-customer-${randomUUID()}@example.invalid`;
    const password = 'Password123!Aa';
    let customerAgent: ReturnType<typeof request.agent>;
    let csrf = '';
    let chosenVariantId = '';
    let createdOrderId = '';
    let customerUserId = '';

    beforeAll(() => {
      customerAgent = request.agent(app);
    });

    afterAll(async () => {
      if (customerUserId) {
        await prisma.inventoryReservation.deleteMany({ where: { order: { userId: customerUserId } } });
        await prisma.payment.deleteMany({ where: { order: { userId: customerUserId } } });
        await prisma.orderItem.deleteMany({ where: { order: { userId: customerUserId } } });
        await prisma.order.deleteMany({ where: { userId: customerUserId } });
        await prisma.cartItem.deleteMany({ where: { cart: { userId: customerUserId } } });
        await prisma.cart.deleteMany({ where: { userId: customerUserId } });
        await prisma.session.deleteMany({ where: { userId: customerUserId } });
        await prisma.user.deleteMany({ where: { id: customerUserId } });
      }
    });

    it('1. Registers a new customer account', async () => {
      const res = await customerAgent.post('/api/v1/auth/register').send({
        email: customerEmail,
        password,
        confirmPassword: password,
        firstName: 'Aarav',
        lastName: 'Sharma',
      });
      expect(res.status).toBe(201);
      expect(res.body.data.user).toMatchObject({
        email: customerEmail,
        role: 'customer',
      });
      customerUserId = res.body.data.user.id;
    });

    it('2. Authenticates and obtains session and CSRF credentials', async () => {
      const res = await customerAgent.post('/api/v1/auth/login').send({
        email: customerEmail,
        password,
      });
      expect(res.status).toBe(200);
      const cookies = (res.headers['set-cookie'] as unknown as string[]) || [];
      const csrfMatch = cookies.find(c => c.startsWith(`${CSRF_COOKIE}=`));
      expect(csrfMatch).toBeDefined();
      csrf = csrfMatch!.split(';')[0]!.split('=')[1]!;

      // Confirm identity via /auth/me
      const meRes = await customerAgent.get('/api/v1/auth/me');
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.email).toBe(customerEmail);
    });

    it('3. Browses public catalog and selects an available product variant', async () => {
      const res = await customerAgent.get('/api/v1/products?page=1&limit=5');
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThan(0);

      const product = res.body.data.items[0];
      const detailRes = await customerAgent.get(`/api/v1/products/${product.slug}`);
      expect(detailRes.status).toBe(200);
      const variant = detailRes.body.data.product.variants.find(
        (v: { inStock: boolean; stockCount: number }) => v.inStock && v.stockCount > 0,
      );
      expect(variant).toBeDefined();
      chosenVariantId = variant.id;
    });

    it('4. Adds the product variant to cart', async () => {
      const res = await customerAgent
        .post('/api/v1/cart/items')
        .set('X-CSRF-Token', csrf)
        .send({ variantId: chosenVariantId, quantity: 1 });
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
    });

    it('5. Executes checkout to reserve inventory and create an order with pending payment', async () => {
      const res = await customerAgent
        .post('/api/v1/checkout')
        .set('X-CSRF-Token', csrf)
        .send({
          shippingAddress: {
            recipientName: 'Aarav Sharma',
            phone: '9876543210',
            line1: '12 Heritage Boulevard',
            city: 'Jaipur',
            state: 'Rajasthan',
            postalCode: '302001',
            country: 'IN',
          },
          deliveryOptionId: 'standard',
        });
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('orderId');
      expect(res.body.data).toHaveProperty('paymentId');
      expect(res.body.data.redirectUrl).toContain('/checkout/payment?paymentId=');
      createdOrderId = res.body.data.orderId;

      // Assert inventory hold is ACTIVE
      expect(await prisma.inventoryReservation.count({ where: { orderId: createdOrderId, status: 'ACTIVE' } })).toBe(1);

      // 6. Completes Demo UPI Payment
      const payRes = await customerAgent
        .post(`/api/v1/payments/${res.body.data.paymentId}/demo-result`)
        .set('X-CSRF-Token', csrf)
        .send({ result: 'SUCCESS' });
      expect(payRes.status).toBe(200);
    });

    it('7. Verifies order is confirmed and appears in customer order history', async () => {
      const res = await customerAgent.get('/api/v1/orders');
      expect(res.status).toBe(200);
      const userOrders = res.body.data.items;
      const order = userOrders.find((o: { id: string }) => o.id === createdOrderId);
      expect(order).toBeDefined();
      expect(order.status).toBe('CONFIRMED');
      expect(order.paymentStatus).toBe('SUCCESS');
    });
  });

  describe('Admin Journey: Login → Dashboard → Products → Inventory → Adjust Stock → Orders → Transition', () => {
    const adminEmail = `e2e-admin-${randomUUID()}@example.invalid`;
    const password = 'AdminPassword123!';
    let adminAgent: ReturnType<typeof request.agent>;
    let csrf = '';
    let adminUserId = '';
    let adminOrderCustomerId = '';
    let adminTestOrderId = '';
    let sampleVariantId = '';

    beforeAll(async () => {
      const [admin, testCustomer] = await Promise.all([
        prisma.user.create({
          data: {
            email: adminEmail,
            passwordHash: await argon2.hash(password),
            role: 'ADMIN',
            emailVerifiedAt: new Date(),
          },
        }),
        prisma.user.create({
          data: {
            email: `e2e-order-cust-${randomUUID()}@example.invalid`,
            passwordHash: await argon2.hash('CustPassword123!'),
            role: 'CUSTOMER',
            emailVerifiedAt: new Date(),
          },
        }),
      ]);
      adminUserId = admin.id;
      adminOrderCustomerId = testCustomer.id;

      // Create an isolated confirmed test order specifically for dispatch transition testing
      const testOrder = await prisma.order.create({
        data: {
          userId: adminOrderCustomerId,
          orderNumber: `ORD-TEST-${Date.now()}`,
          status: 'CONFIRMED',
          subtotalPaise: 249900,
          shippingChargePaise: 0,
          discountPaise: 0,
          totalPaise: 249900,
          shippingAddress: {
            recipientName: 'Test Recipient',
            phone: '9876543210',
            line1: '123 Test St',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400001',
            country: 'IN',
          },
        },
      });
      adminTestOrderId = testOrder.id;

      const variant = await prisma.productVariant.findFirstOrThrow({ where: { status: 'ACTIVE' } });
      sampleVariantId = variant.id;

      adminAgent = request.agent(app);
      const loginRes = await adminAgent.post('/api/v1/auth/login').send({ email: adminEmail, password });
      const cookies = (loginRes.headers['set-cookie'] as unknown as string[]) || [];
      csrf = cookies.find(c => c.startsWith(`${CSRF_COOKIE}=`))!.split(';')[0]!.split('=')[1]!;
    });

    afterAll(async () => {
      if (adminTestOrderId) {
        await prisma.order.deleteMany({ where: { id: adminTestOrderId } });
      }
      if (adminOrderCustomerId) {
        await prisma.user.deleteMany({ where: { id: adminOrderCustomerId } });
      }
      if (adminUserId) {
        await prisma.inventoryMovement.deleteMany({ where: { reason: 'E2E adjustment test' } });
        await prisma.auditLog.deleteMany({ where: { actorId: adminUserId } });
        await prisma.session.deleteMany({ where: { userId: adminUserId } });
        await prisma.user.deleteMany({ where: { id: adminUserId } });
      }
    });

    it('1. Fetches real-time dashboard business metrics', async () => {
      const res = await adminAgent.get('/api/v1/admin/dashboard');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalProducts');
      expect(res.body.data).toHaveProperty('totalOrders');
      expect(res.body.data).toHaveProperty('totalRevenue');
    });

    it('2. Lists paginated products with category and variant associations', async () => {
      const res = await adminAgent.get('/api/v1/admin/products?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual(expect.any(Array));
    });

    it('3. Queries paginated SKU inventory matrix', async () => {
      const res = await adminAgent.get('/api/v1/admin/inventory?page=1&limit=25&filter=all');
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        page: 1,
        limit: 25,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });

    it('4. Performs an atomic inventory adjustment and audits the movement', async () => {
      const before = await prisma.productVariant.findUniqueOrThrow({ where: { id: sampleVariantId } });
      const res = await adminAgent
        .post('/api/v1/admin/inventory/adjustments')
        .set('X-CSRF-Token', csrf)
        .send({
          variantId: sampleVariantId,
          quantity: 2,
          type: 'RESTOCK',
          reason: 'E2E adjustment test',
        });
      expect(res.status).toBe(200);

      const after = await prisma.productVariant.findUniqueOrThrow({ where: { id: sampleVariantId } });
      expect(after.stockQuantity).toBe(before.stockQuantity + 2);

      // Revert stock
      await prisma.productVariant.update({ where: { id: sampleVariantId }, data: { stockQuantity: before.stockQuantity } });
    });

    it('5. Lists customer orders and updates dispatch status transitions', async () => {
      const orderListRes = await adminAgent.get('/api/v1/admin/orders?page=1&limit=10');
      expect(orderListRes.status).toBe(200);
      expect(orderListRes.body.data.items).toEqual(expect.any(Array));

      // Advance our isolated test order to PROCESSING
      const res = await adminAgent
        .patch(`/api/v1/admin/orders/${adminTestOrderId}/status`)
        .set('X-CSRF-Token', csrf)
        .send({ status: 'PROCESSING' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PROCESSING');
    });
  });
});
