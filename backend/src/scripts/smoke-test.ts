import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../app.js';
import { getPrismaClient } from '../config/database.js';
import { CommerceService } from '../services/commerce.service.js';
import { AdminService } from '../services/admin.service.js';
import { CSRF_COOKIE, SESSION_COOKIE } from '../utils/auth.js';

interface SmokeStepResult {
  step: number;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

export interface SmokeTestOptions {
  requireExplicitTarget?: boolean;
  targetUrl?: string;
  targetEnvironment?: 'local' | 'staging' | 'production';
  allowMutations?: boolean;
}

export interface SmokeTargetContract {
  target: string | typeof app;
  label: string;
  environment: 'local' | 'staging';
}

/**
 * Resolve the smoke target from an explicit environment contract. Host names are
 * deployment data and cannot establish whether mutating a target is safe.
 */
export function resolveSmokeTarget(options: SmokeTestOptions = {}): SmokeTargetContract {
  const rawTarget = options.targetUrl || process.env.SMOKE_BASE_URL?.trim();
  const configuredEnvironment = options.targetEnvironment || process.env.SMOKE_TARGET_ENV?.trim();
  const requireExternal = options.requireExplicitTarget || process.env.SMOKE_REQUIRE_TARGET === 'true';
  const allowMutations = options.allowMutations ?? process.env.SMOKE_ALLOW_MUTATIONS === 'true';

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Smoke tests are blocked in NODE_ENV=production because they create and delete database records.');
  }
  if (configuredEnvironment === 'production') {
    throw new Error('Mutating smoke tests are prohibited when SMOKE_TARGET_ENV=production.');
  }
  if (configuredEnvironment && configuredEnvironment !== 'local' && configuredEnvironment !== 'staging') {
    throw new Error('SMOKE_TARGET_ENV must be one of: local, staging, production.');
  }
  if (requireExternal && !rawTarget) {
    throw new Error('External smoke tests require an explicit SMOKE_BASE_URL target (cannot default to in-process app).');
  }
  if (rawTarget && !configuredEnvironment) {
    throw new Error('External smoke tests require SMOKE_TARGET_ENV=staging; target safety cannot be inferred from a hostname.');
  }
  if (rawTarget && configuredEnvironment !== 'staging') {
    throw new Error('External mutating smoke tests are permitted only with SMOKE_TARGET_ENV=staging.');
  }
  if (rawTarget && !allowMutations) {
    throw new Error('External staging smoke tests require SMOKE_ALLOW_MUTATIONS=true.');
  }
  if (!rawTarget && configuredEnvironment === 'staging') {
    throw new Error('SMOKE_TARGET_ENV=staging requires an explicit SMOKE_BASE_URL target.');
  }

  if (rawTarget) {
    let parsed: URL;
    try {
      parsed = new URL(rawTarget);
    } catch {
      throw new Error('SMOKE_BASE_URL must be a valid absolute HTTP(S) URL.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('SMOKE_BASE_URL must use HTTP or HTTPS.');
    }
    return { target: parsed.origin, label: parsed.origin, environment: 'staging' };
  }

  return { target: app, label: 'in-process Express app', environment: 'local' };
}

export async function runProductionSmokeTests(options: SmokeTestOptions = {}): Promise<{
  success: boolean;
  results: SmokeStepResult[];
}> {
  const smokeContract = resolveSmokeTarget(options);
  const smokeTarget = smokeContract.target;
  const targetLabel = smokeContract.label;

  const prisma = getPrismaClient();
  const commerceService = new CommerceService();
  const adminService = new AdminService();
  const results: SmokeStepResult[] = [];

  const runStep = async (
    step: number,
    name: string,
    action: () => Promise<string>,
  ): Promise<void> => {
    try {
      const details = await action();
      results.push({ step, name, status: 'PASS', details });
      // eslint-disable-next-line no-console
      console.log(`  ✓ [${String(step).padStart(2, '0')}/19] ${name} — ${details}`);
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Unknown error';
      results.push({ step, name, status: 'FAIL', details });
      // eslint-disable-next-line no-console
      console.error(`  ✗ [${String(step).padStart(2, '0')}/19] ${name} — FAILED: ${details}`);
    }
  };
  const testId = randomUUID();
  const smokeEmail = `smoke_${testId.substring(0, 8)}@purvaja.fashion`;
  const smokePassword = `SmokePass!${testId.substring(0, 8)}`;
  let testUserId = '';
  let testVariantId = '';
  let testOrderNumber = '';
  let testOrderId = '';
  let testPaymentId = '';
  let customerAgent: ReturnType<typeof request.agent>;
  let customerCsrf = '';

  // eslint-disable-next-line no-console
  console.log('\n======================================================');
  // eslint-disable-next-line no-console
  console.log(` PURVAJA FASHION — SMOKE TEST SUITE (${targetLabel})`);
  // eslint-disable-next-line no-console
  console.log('======================================================\n');

  try {
    // 1. Public catalog
    await runStep(1, 'Public Catalog', async () => {
      const res = await request(smokeTarget).get('/api/v1/products?limit=12&page=1');
      if (res.status !== 200 || !res.body.success) throw new Error(`HTTP ${res.status}`);
      const items = res.body.data?.items ?? [];
      if (!Array.isArray(items) || items.length === 0) throw new Error('No catalog products found');
      return `Loaded ${items.length} products (total: ${res.body.data.total})`;
    });

    // 2. Product details
    let sampleProductSlug = '';
    await runStep(2, 'Product Details', async () => {
      const inStock = await prisma.productVariant.findFirst({
        where: { status: 'ACTIVE', stockQuantity: { gte: 5 } },
        include: { product: true },
      });
      if (!inStock) throw new Error('No active variants with available stock found');
      testVariantId = inStock.id;
      sampleProductSlug = inStock.product.slug;

      const res = await request(smokeTarget).get(`/api/v1/products/${sampleProductSlug}`);
      if (res.status !== 200 || !res.body.success) throw new Error(`HTTP ${res.status}`);
      return `Retrieved product '${sampleProductSlug}' with variant '${testVariantId}' (stock: ${inStock.stockQuantity})`;
    });

    // 3. Customer registration
    await runStep(3, 'Customer Registration', async () => {
      const res = await request(smokeTarget)
        .post('/api/v1/auth/register')
        .send({
          email: smokeEmail,
          password: smokePassword,
          confirmPassword: smokePassword,
          firstName: 'Smoke',
          lastName: 'Tester',
        });
      if (res.status !== 201 || !res.body.success) throw new Error(`HTTP ${res.status}: ${JSON.stringify(res.body)}`);
      testUserId = res.body.data.user.id;
      // Mark verified in DB for smoke testing flow
      await prisma.user.update({
        where: { id: testUserId },
        data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
      });
      return `Registered user ID ${testUserId}`;
    });

    // 4. Customer login
    await runStep(4, 'Customer Login', async () => {
      customerAgent = request.agent(smokeTarget);
      const res = await customerAgent
        .post('/api/v1/auth/login')
        .send({ email: smokeEmail, password: smokePassword });
      if (res.status !== 200 || !res.body.success) throw new Error(`HTTP ${res.status}`);
      const cookies = (res.headers['set-cookie'] as unknown as string[]) || [];
      const csrfEntry = cookies.find(c => c.startsWith(`${CSRF_COOKIE}=`));
      if (!csrfEntry) throw new Error('CSRF cookie not set on login');
      customerCsrf = csrfEntry.split(';')[0]!.split('=')[1]!;
      return `Authenticated session established, CSRF token extracted`;
    });

    // 5. CSRF protection
    await runStep(5, 'CSRF Protection', async () => {
      const resMissing = await customerAgent
        .post('/api/v1/cart/items')
        .send({ variantId: testVariantId, quantity: 1 });
      if (resMissing.status !== 403) throw new Error(`Expected 403 on missing CSRF, got ${resMissing.status}`);

      const resMismatched = await customerAgent
        .post('/api/v1/cart/items')
        .set('X-CSRF-Token', 'invalid-token-1234')
        .send({ variantId: testVariantId, quantity: 1 });
      if (resMismatched.status !== 403) throw new Error(`Expected 403 on mismatched CSRF, got ${resMismatched.status}`);

      return 'Missing and mismatched CSRF tokens both rejected with 403';
    });

    // 6. Cart management
    await runStep(6, 'Cart Management', async () => {
      const addRes = await customerAgent
        .post('/api/v1/cart/items')
        .set('X-CSRF-Token', customerCsrf)
        .send({ variantId: testVariantId, quantity: 2 });
      if (addRes.status !== 200 || !addRes.body.success) {
        throw new Error(`Add failed: HTTP ${addRes.status}: ${JSON.stringify(addRes.body)}`);
      }

      const cartRes = await customerAgent.get('/api/v1/cart');
      if (cartRes.status !== 200 || cartRes.body.data.items.length === 0) throw new Error('Cart empty');
      const cartItemId = cartRes.body.data.items[0].id;

      const patchRes = await customerAgent
        .patch(`/api/v1/cart/items/${cartItemId}`)
        .set('X-CSRF-Token', customerCsrf)
        .send({ quantity: 1 });
      if (patchRes.status !== 200) throw new Error(`Update failed: HTTP ${patchRes.status}`);

      return 'Add item, retrieve cart, and update quantity succeeded';
    });

    // 7. Checkout reservation
    await runStep(7, 'Checkout & Stock Reservation', async () => {
      const checkoutRes = await customerAgent
        .post('/api/v1/checkout')
        .set('X-CSRF-Token', customerCsrf)
        .set('Idempotency-Key', `smoke-idemp-${testId}`)
        .send({
          items: [{ variantId: testVariantId, quantity: 1 }],
          shippingAddress: {
            recipientName: 'Smoke Tester',
            phone: '9876543210',
            line1: '123 Test Runway',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400001',
            country: 'IN',
          },
        });

      if (checkoutRes.status !== 200 && checkoutRes.status !== 201) {
        throw new Error(`Checkout failed: HTTP ${checkoutRes.status}: ${JSON.stringify(checkoutRes.body)}`);
      }

      testOrderId = checkoutRes.body.data.orderId || checkoutRes.body.data.order?.id;
      testPaymentId = checkoutRes.body.data.paymentId || checkoutRes.body.data.payment?.id;

      if (!testOrderId || !testPaymentId) {
        throw new Error(`Missing orderId or paymentId in response: ${JSON.stringify(checkoutRes.body)}`);
      }

      const order = await prisma.order.findUnique({ where: { id: testOrderId } });
      testOrderNumber = order?.orderNumber || testOrderId;

      const reservation = await prisma.inventoryReservation.findFirst({
        where: { orderId: testOrderId, status: 'ACTIVE' },
      });
      if (!reservation) throw new Error('Active inventory reservation was not created');

      return `Order ${testOrderNumber} created with active reservation`;
    });

    // 8. Payment initiation
    await runStep(8, 'Payment Initiation', async () => {
      const res = await customerAgent
        .post(`/api/v1/payments/${testPaymentId}/initiate`)
        .set('X-CSRF-Token', customerCsrf);
      if (res.status !== 200 || !res.body.success) throw new Error(`HTTP ${res.status}`);
      return `Payment ${testPaymentId} initiated, status: ${res.body.data.status}`;
    });

    // 9. Payment status & cancellation
    await runStep(9, 'Payment Status & Safe Cancellation', async () => {
      const statusRes = await customerAgent.get(`/api/v1/payments/${testPaymentId}/status`);
      if (statusRes.status !== 200) throw new Error(`Status check failed: HTTP ${statusRes.status}`);

      const cancelRes = await customerAgent
        .post(`/api/v1/orders/${testOrderId}/cancel`)
        .set('X-CSRF-Token', customerCsrf)
        .send({ reason: 'Smoke test automated cleanup' });
      if (cancelRes.status !== 200) throw new Error(`Cancel failed: HTTP ${cancelRes.status}`);

      const postCancelRes = await prisma.inventoryReservation.findFirst({
        where: { orderId: testOrderId, status: 'ACTIVE' },
      });
      if (postCancelRes) throw new Error('Reservation was not released after order cancellation');

      return 'Payment status verified and reservation safely released on order cancel';
    });

    // 10. Order history
    await runStep(10, 'Customer Order History', async () => {
      const res = await customerAgent.get('/api/v1/orders');
      if (res.status !== 200 || !res.body.success) throw new Error(`HTTP ${res.status}`);
      const orders = Array.isArray(res.body.data) ? res.body.data : res.body.data?.items || [];
      const found = orders.some((o: { id: string }) => o.id === testOrderId);
      if (!found) throw new Error('Cancelled smoke order missing from order history');
      return `Retrieved order list (${orders.length} orders found)`;
    });

    // 11. Reservation expiry sweep
    await runStep(11, 'Reservation Expiry Sweep', async () => {
      const sweep = await commerceService.releaseExpiredReservations();
      return `Sweep executed cleanly, released ${sweep.releasedCount} expired reservations`;
    });

    // 12. Coupon validation
    await runStep(12, 'Coupon Validation', async () => {
      const coupon = await prisma.coupon.findFirst({
        where: { isActive: true },
      });
      if (!coupon) {
        return 'No active coupons seeded; skipped validation check';
      }
      const res = await customerAgent
        .post('/api/v1/coupons/validate')
        .set('X-CSRF-Token', customerCsrf)
        .send({ code: coupon.code, subtotalPaise: (coupon.minimumOrderPaise ?? 0) + 10000 });
      if (res.status !== 200 || !res.body.success) throw new Error(`HTTP ${res.status}`);
      return `Coupon '${coupon.code}' validated: discount ${res.body.data.discountPaise} paise`;
    });

    // 13. Return request validation
    await runStep(13, 'Return Request Policy Enforcement', async () => {
      // Order is CANCELLED, return should be rejected with 400
      const res = await customerAgent
        .post(`/api/v1/orders/${testOrderId}/returns`)
        .set('X-CSRF-Token', customerCsrf)
        .send({ reason: 'Wrong fit', items: [{ variantId: testVariantId, quantity: 1 }] });
      if (res.status !== 400) throw new Error(`Expected 400 on returning cancelled order, got ${res.status}`);
      return 'Return on non-delivered order correctly rejected with 400';
    });

    // 14. Admin unauthenticated access -> 401
    await runStep(14, 'Admin Unauthenticated Protection (401)', async () => {
      const res = await request(smokeTarget).get('/api/v1/admin/dashboard');
      if (res.status !== 401) throw new Error(`Expected 401, received HTTP ${res.status}`);
      return 'Unauthenticated admin access rejected with HTTP 401';
    });

    // 15. Customer admin access -> 403
    await runStep(15, 'Customer RBAC Admin Rejection (403)', async () => {
      const res = await customerAgent.get('/api/v1/admin/dashboard');
      if (res.status !== 403) throw new Error(`Expected 403, received HTTP ${res.status}`);
      return 'Customer role access to admin dashboard rejected with HTTP 403';
    });

    // 16. Admin access -> 200
    await runStep(16, 'Admin Authenticated Dashboard (200)', async () => {
      const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN', status: 'ACTIVE' },
      });
      if (!adminUser) throw new Error('No active admin user found in database');

      // Create a temporary admin session
      const tempSessionToken = randomUUID();
      const crypto = await import('node:crypto');
      const hash = crypto.createHash('sha256').update(tempSessionToken).digest('hex');
      await prisma.session.create({
        data: {
          userId: adminUser.id,
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const adminAgent = request.agent(smokeTarget);
      const res = await adminAgent
        .get('/api/v1/admin/dashboard')
        .set('Cookie', [`${SESSION_COOKIE}=${tempSessionToken}`]);

      // Cleanup temp admin session
      await prisma.session.deleteMany({ where: { tokenHash: hash } });

      if (res.status !== 200 || !res.body.success) throw new Error(`HTTP ${res.status}`);
      return `Admin dashboard returned metrics (${res.body.data.totalProducts} products, ${res.body.data.totalOrders} orders)`;
    });

    // 17. Inventory adjustment
    await runStep(17, 'Admin Inventory Adjustment Audit', async () => {
      const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN', status: 'ACTIVE' },
      });
      if (!adminUser) throw new Error('No admin user available for adjustment audit');

      const initialVariant = await prisma.productVariant.findUniqueOrThrow({
        where: { id: testVariantId },
      });

      // Adjust +1
      await adminService.adjust(adminUser.id, {
        variantId: testVariantId,
        quantity: 1,
        type: 'RESTOCK',
        reason: 'Smoke test inventory probe',
      });

      const afterRestock = await prisma.productVariant.findUniqueOrThrow({
        where: { id: testVariantId },
      });
      if (afterRestock.stockQuantity !== initialVariant.stockQuantity + 1) {
        throw new Error('Inventory restock quantity mismatch');
      }

      // Restore to original
      await adminService.adjust(adminUser.id, {
        variantId: testVariantId,
        quantity: -1,
        type: 'CORRECTION',
        reason: 'Smoke test inventory restore',
      });

      const restored = await prisma.productVariant.findUniqueOrThrow({
        where: { id: testVariantId },
      });
      if (restored.stockQuantity !== initialVariant.stockQuantity) {
        throw new Error('Inventory restore quantity mismatch');
      }

      return `Adjusted and safely restored stock count (${restored.stockQuantity} units)`;
    });

    // 18. Health endpoint
    await runStep(18, 'Health Liveness Endpoint (/healthz)', async () => {
      const res = await request(smokeTarget).get('/healthz');
      if (res.status !== 200 || res.body.data?.status !== 'healthy') {
        throw new Error(`HTTP ${res.status}: ${JSON.stringify(res.body)}`);
      }
      return `Liveness healthy, uptime: ${Math.round(res.body.data.uptime)}s`;
    });

    // 19. Readiness endpoint
    await runStep(19, 'Readiness Endpoint (/readyz)', async () => {
      const res = await request(smokeTarget).get('/readyz');
      if (res.status !== 200 || res.body.data?.status !== 'ready') {
        throw new Error(`HTTP ${res.status}: ${JSON.stringify(res.body)}`);
      }
      const checks = res.body.data.checks || {};
      return `Ready with DB: ${checks.database}, Migrations: ${checks.migrations}, Redis: ${checks.redis}`;
    });

  } finally {
    // -------------------------------------------------------------------------
    // Automatic Disposable Test Data Cleanup
    // -------------------------------------------------------------------------
    // eslint-disable-next-line no-console
    console.log('\n🧹 Cleaning up disposable test records...');
    try {
      if (testUserId) {
        // First delete any orders created by this test user
        const userOrders = await prisma.order.findMany({
          where: { userId: testUserId },
          select: { id: true },
        });
        for (const uo of userOrders) {
          await prisma.inventoryMovement.deleteMany({ where: { referenceId: uo.id } });
          await prisma.inventoryReservation.deleteMany({ where: { orderId: uo.id } });
          await prisma.payment.deleteMany({ where: { orderId: uo.id } });
          await prisma.orderReturn.deleteMany({ where: { orderId: uo.id } });
          await prisma.orderItem.deleteMany({ where: { orderId: uo.id } });
          await prisma.couponRedemption.deleteMany({ where: { orderId: uo.id } });
          await prisma.order.delete({ where: { id: uo.id } });
        }
        await prisma.cartItem.deleteMany({ where: { cart: { userId: testUserId } } });
        await prisma.cart.deleteMany({ where: { userId: testUserId } });
        await prisma.session.deleteMany({ where: { userId: testUserId } });
        await prisma.address.deleteMany({ where: { userId: testUserId } });
        await prisma.user.deleteMany({ where: { id: testUserId } });
      }
      // Clean up smoke test inventory movements
      await prisma.inventoryMovement.deleteMany({
        where: { reason: { startsWith: 'Smoke test inventory' } },
      });
      // eslint-disable-next-line no-console
      console.log('✅ Disposable test data cleanly purged.\n');
    } catch (cleanupError) {
      // eslint-disable-next-line no-console
      console.warn('⚠️  Cleanup warning:', cleanupError);
    }
  }

  const failedCount = results.filter(r => r.status === 'FAIL').length;
  const passedCount = results.filter(r => r.status === 'PASS').length;

  // eslint-disable-next-line no-console
  console.log('======================================================');
  // eslint-disable-next-line no-console
  console.log(` SMOKE TEST SUMMARY: ${passedCount}/19 PASSED, ${failedCount} FAILED`);
  // eslint-disable-next-line no-console
  console.log('======================================================\n');

  return {
    success: failedCount === 0,
    results,
  };
}

if (process.argv[1]?.endsWith('smoke-test.ts') || process.argv[1]?.endsWith('smoke-test.js')) {
  runProductionSmokeTests()
    .then(({ success }) => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      // eslint-disable-next-line no-console
      console.error('Fatal smoke test runner failure:', err);
      process.exit(1);
    });
}
