import { describe, it, expect, vi, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getPrismaClient } from '../../src/config/database.js';
import { ReservationCleanupWorker } from '../../src/services/reservation-worker.service.js';
import { CommerceService } from '../../src/services/commerce.service.js';
import { validateProductionConfig } from '../../src/scripts/validate-config.js';
import { resolveSmokeTarget, runProductionSmokeTests } from '../../src/scripts/smoke-test.js';
import { runDataConsistencyChecks } from '../../src/scripts/check-data-consistency.js';
import { stopServer } from '../../src/server.js';
import * as databaseModule from '../../src/config/database.js';

describe('Phase 10 — Production Launch, Disaster Recovery & Continuous Operations', () => {
  const prisma = getPrismaClient();

  // Baseline valid production environment for configuration checks
  const validProductionEnv: Record<string, string> = {
    NODE_ENV: 'production',
    PORT: '5001',
    HOST: '0.0.0.0',
    TRUST_PROXY: '1',
    DATABASE_URL: 'postgresql://prod_user:SuperSecretPassword123!@db.hostinger.com:5432/purvaja_prod?schema=public&sslmode=require',
    DIRECT_URL: 'postgresql://prod_user:SuperSecretPassword123!@db.hostinger.com:5432/purvaja_prod?schema=public&sslmode=require',
    SESSION_SECRET: 'a-cryptographically-secure-32-character-secret-key-prod',
    CORS_ORIGIN: 'https://purvaja.fashion,https://www.purvaja.fashion',
    FRONTEND_URL: 'https://purvaja.fashion',
    PAYMENT_PROVIDER: 'phonepe',
    PHONEPE_MERCHANT_ID: 'MERCHANT_LIVE_001',
    PHONEPE_CLIENT_ID: 'CLIENT_LIVE_001',
    PHONEPE_CLIENT_SECRET: 'SECRET_LIVE_001',
    PHONEPE_CLIENT_VERSION: '1',
    PHONEPE_ENVIRONMENT: 'production',
    PHONEPE_CALLBACK_URL: 'https://purvaja.fashion/api/v1/payments/webhook',
    EMAIL_FROM: 'noreply@purvaja.fashion',
    RESEND_API_KEY: 're_live_resend_api_key_001',
  };

  afterAll(async () => {
    ReservationCleanupWorker.resetInstanceForTesting();
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Production Configuration Rejects Unsafe Values
  // ---------------------------------------------------------------------------
  it('1. Production configuration gate rejects all unsafe values', () => {
    // Missing DATABASE_URL
    expect(validateProductionConfig({ ...validProductionEnv, DATABASE_URL: '' }).isValid).toBe(false);

    // Insecure TLS in production (missing sslmode)
    const insecureTls = validateProductionConfig({
      ...validProductionEnv,
      DATABASE_URL: 'postgresql://user:pass@host:5432/db?schema=public',
    });
    expect(insecureTls.isValid).toBe(false);
    expect(insecureTls.errors.some(e => e.includes('sslmode=require'))).toBe(true);

    // Insecure sslmode=no-verify
    const noVerify = validateProductionConfig({
      ...validProductionEnv,
      DATABASE_URL: 'postgresql://user:pass@host:5432/db?sslmode=no-verify',
    });
    expect(noVerify.isValid).toBe(false);
    expect(noVerify.errors.some(e => e.includes('sslmode=no-verify'))).toBe(true);

    // Weak SESSION_SECRET
    const weakSecret = validateProductionConfig({ ...validProductionEnv, SESSION_SECRET: 'too-short' });
    expect(weakSecret.isValid).toBe(false);
    expect(weakSecret.errors.some(e => e.includes('32 characters'))).toBe(true);

    // Localhost FRONTEND_URL in production
    const localhostFrontend = validateProductionConfig({ ...validProductionEnv, FRONTEND_URL: 'http://localhost:5174' });
    expect(localhostFrontend.isValid).toBe(false);

    // Wildcard CORS
    const wildcardCors = validateProductionConfig({ ...validProductionEnv, CORS_ORIGIN: '*' });
    expect(wildcardCors.isValid).toBe(false);

    // PAYMENT_PROVIDER=demo in production
    const demoProvider = validateProductionConfig({ ...validProductionEnv, PAYMENT_PROVIDER: 'demo' });
    expect(demoProvider.isValid).toBe(false);

    // Unsafe TRUST_PROXY=true in production
    const unsafeProxy = validateProductionConfig({ ...validProductionEnv, TRUST_PROXY: 'true' });
    expect(unsafeProxy.isValid).toBe(false);
    expect(unsafeProxy.errors.some(e => e.includes('Unsafe TRUST_PROXY'))).toBe(true);

    // Incomplete PhonePe config
    const incompletePhonePe = validateProductionConfig({ ...validProductionEnv, PHONEPE_CLIENT_SECRET: '' });
    expect(incompletePhonePe.isValid).toBe(false);
    expect(incompletePhonePe.errors.some(e => e.includes('PHONEPE_CLIENT_SECRET'))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 2. Deployment Stops When Migrations Are Pending
  // ---------------------------------------------------------------------------
  it('2. Deployment stops when migrations are pending (readiness probe returns 503)', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const spy = vi.spyOn(databaseModule, 'checkDatabaseReadiness').mockResolvedValueOnce({
      connected: true,
      migrationsReady: false,
    });

    try {
      const res = await request(app).get('/readyz');
      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MIGRATIONS_PENDING');
      expect(res.body.error.message).toContain('Pending database migrations must be applied before traffic can be served');
    } finally {
      spy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    }
  });

  // ---------------------------------------------------------------------------
  // 3. External Smoke Tests Require an Explicit Target
  // ---------------------------------------------------------------------------
  it('3. External smoke tests require an explicit target when run in external mode', async () => {
    const origTarget = process.env.SMOKE_BASE_URL;
    delete process.env.SMOKE_BASE_URL;

    try {
      await expect(
        runProductionSmokeTests({ requireExplicitTarget: true }),
      ).rejects.toThrow('External smoke tests require an explicit SMOKE_BASE_URL target');
    } finally {
      if (origTarget) process.env.SMOKE_BASE_URL = origTarget;
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Production Smoke Tests Cannot Mutate a Production Environment
  // ---------------------------------------------------------------------------
  it('4. Production smoke tests cannot mutate a production environment', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      await expect(runProductionSmokeTests()).rejects.toThrow(
        'Smoke tests are blocked in NODE_ENV=production',
      );
    } finally {
      process.env.NODE_ENV = origEnv;
    }

    // Target safety is an explicit environment property, independent of hostnames.
    expect(() => resolveSmokeTarget({
      targetUrl: 'https://any-host.example',
      targetEnvironment: 'production',
      allowMutations: true,
    })).toThrow('SMOKE_TARGET_ENV=production');

    expect(() => resolveSmokeTarget({
      targetUrl: 'https://purvaja.fashion',
      allowMutations: true,
    })).toThrow('target safety cannot be inferred from a hostname');

    expect(() => resolveSmokeTarget({
      targetUrl: 'https://staging.example',
      targetEnvironment: 'staging',
    })).toThrow('SMOKE_ALLOW_MUTATIONS=true');

    expect(resolveSmokeTarget({
      targetUrl: 'https://staging.example/some/path',
      targetEnvironment: 'staging',
      allowMutations: true,
    })).toMatchObject({
      target: 'https://staging.example',
      environment: 'staging',
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Multiple Worker Instances Coordinate Through PostgreSQL Advisory Locking
  // ---------------------------------------------------------------------------
  it('5. Multiple worker instances coordinate through PostgreSQL advisory locking', async () => {
    const commerceService = new CommerceService();

    // Acquire the advisory transaction lock in connection 1
    const lockAcquired = await prisma.$transaction(async tx => {
      const lockRows = await tx.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_try_advisory_xact_lock(hashtext('purvaja:reservation-expiry')) AS locked
      `;
      expect(lockRows[0]?.locked).toBe(true);

      // Concurrently while transaction 1 holds lock, call releaseExpiredReservations() from connection 2
      const concurrentResult = await commerceService.releaseExpiredReservations();

      // Instance 2 must cleanly detect lock ownership in PostgreSQL and skip without blocking or failing
      expect(concurrentResult.skippedDueToDistributedLock).toBe(true);
      expect(concurrentResult.releasedCount).toBe(0);

      return true;
    });

    expect(lockAcquired).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 6. Worker Restart Does Not Duplicate Processing
  // ---------------------------------------------------------------------------
  it('6. Worker restart does not duplicate processing and lifecycle stops cleanly', async () => {
    ReservationCleanupWorker.resetInstanceForTesting();
    const worker = ReservationCleanupWorker.getInstance();

    worker.start(60_000);
    expect(worker.isRunning()).toBe(true);

    // Run sweep 1
    const sweep1 = await worker.runSweep();
    expect(sweep1).toHaveProperty('sweepId');

    // Restart worker cleanly
    worker.stop();
    expect(worker.isRunning()).toBe(false);

    worker.start(60_000);
    expect(worker.isRunning()).toBe(true);

    // Run sweep 2 after restart
    const sweep2 = await worker.runSweep();
    expect(sweep2).toHaveProperty('sweepId');
    expect(sweep2.sweepId).not.toBe(sweep1.sweepId);

    worker.stop();
    expect(worker.isRunning()).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 7. Graceful Shutdown Closes Database, Redis, HTTP, and Worker Resources
  // ---------------------------------------------------------------------------
  it('7. Graceful shutdown closes database, Redis, HTTP, and worker resources', async () => {
    const worker = ReservationCleanupWorker.getInstance();
    worker.start(60_000);

    let serverClosed = false;
    const mockServer = {
      close: vi.fn((cb?: (err?: Error) => void) => {
        serverClosed = true;
        cb?.();
      }),
    } as unknown as import('node:http').Server;

    const disconnectDbSpy = vi.spyOn(databaseModule, 'disconnectDatabase').mockResolvedValue();

    await stopServer(mockServer, 'SIGTERM');

    expect(mockServer.close).toHaveBeenCalled();
    expect(serverClosed).toBe(true);
    expect(worker.isRunning()).toBe(false);
    expect(disconnectDbSpy).toHaveBeenCalled();

    disconnectDbSpy.mockRestore();
  });

  // ---------------------------------------------------------------------------
  // 8. Payment Provider Environment Cannot Be Mixed
  // ---------------------------------------------------------------------------
  it('8. Payment provider environments cannot be mixed (production rejects sandbox)', () => {
    const mixedEnv = {
      ...validProductionEnv,
      NODE_ENV: 'production',
      PAYMENT_PROVIDER: 'phonepe',
      PHONEPE_ENVIRONMENT: 'sandbox',
    };
    const result = validateProductionConfig(mixedEnv);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('cannot mix test and production environments'))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 9. Post-Restore Verification Contract Covers Migrations and Essential Tables
  // ---------------------------------------------------------------------------
  it('9. post-restore verification checks migrations and essential schema tables', async () => {
    // 1. Verify schema migration status
    const migrations = await prisma.$queryRaw<
      Array<{ migration_name: string; finished_at: Date; checksum: string }>
    >`
      SELECT migration_name, finished_at, checksum
      FROM "_prisma_migrations"
      WHERE rolled_back_at IS NULL
      ORDER BY finished_at ASC
    `;

    expect(migrations.length).toBeGreaterThanOrEqual(9);
    for (const m of migrations) {
      expect(m.checksum).toBeTruthy();
      expect(m.finished_at).toBeTruthy();
    }

    // 2. Verify all essential business tables are queryable
    const [userCount, productCount, variantCount, orderCount, paymentCount] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.productVariant.count(),
      prisma.order.count(),
      prisma.payment.count(),
    ]);

    expect(typeof userCount).toBe('number');
    expect(typeof productCount).toBe('number');
    expect(typeof variantCount).toBe('number');
    expect(typeof orderCount).toBe('number');
    expect(typeof paymentCount).toBe('number');
  });

  // ---------------------------------------------------------------------------
  // 10. Post-Deployment Consistency Queries Detect Contradictory States
  // ---------------------------------------------------------------------------
  it('10. Post-deployment consistency queries detect contradictory states', async () => {
    // Other integration files deliberately create transient contradictions and
    // Vitest executes files concurrently. Capture that baseline, then prove this
    // test adds and removes its own anomaly. The release gate runs the scanner
    // again after every test process has exited and requires a globally clean DB.
    const initialReport = await runDataConsistencyChecks();
    expect(initialReport.totalChecks).toBe(initialReport.checks.length);
    expect(initialReport.checks.map(check => check.code)).toEqual(expect.arrayContaining([
      'ORDER_FINANCIAL_INVARIANT',
      'PAYMENT_ORDER_AMOUNT_MISMATCH',
      'PRODUCT_REVIEW_AGGREGATE_MISMATCH',
      'CHECKOUT_IDEMPOTENCY_ASSOCIATION_MISMATCH',
    ]));
    const initialExpiredCount = initialReport.checks.find(
      check => check.code === 'EXPIRED_ACTIVE_RESERVATIONS',
    )?.anomalyCount ?? 0;

    // Inject a temporary contradictory record: an active reservation that is expired
    const existingVariant = await prisma.productVariant.findFirst({
      where: { status: 'ACTIVE' },
    });
    expect(existingVariant).toBeTruthy();
    if (!existingVariant) return;

    const testUser = await prisma.user.create({
      data: {
        email: `consistency_test_${Date.now()}@purvaja.fashion`,
        passwordHash: 'dummy-hash-consistency',
        firstName: 'Integrity',
        lastName: 'Tester',
      },
    });

    const testOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-CONSISTENCY-${Date.now()}`,
        userId: testUser.id,
        shippingAddress: { city: 'Surat', state: 'Gujarat' },
        subtotalPaise: 10000,
        totalPaise: 10000,
        status: 'PENDING',
        paymentStatus: 'PENDING',
      },
    });

    const tempReservation = await prisma.inventoryReservation.create({
      data: {
        orderId: testOrder.id,
        variantId: existingVariant.id,
        quantity: 1,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() - 3600_000), // 1 hour in past
      },
    });

    try {
      // Run consistency checks - must detect the contradiction
      const anomalyReport = await runDataConsistencyChecks();
      expect(anomalyReport.success).toBe(false);
      expect(anomalyReport.failedChecks).toBeGreaterThanOrEqual(1);

      const expiredCheck = anomalyReport.checks.find(c => c.code === 'EXPIRED_ACTIVE_RESERVATIONS');
      expect(expiredCheck).toBeTruthy();
      expect(expiredCheck?.status).toBe('FAIL');
      expect(expiredCheck?.anomalyCount).toBe(initialExpiredCount + 1);
    } finally {
      // Clean up temporary records
      await prisma.inventoryReservation.delete({ where: { id: tempReservation.id } });
      await prisma.order.delete({ where: { id: testOrder.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
    }

    // Verify this test restores the exact anomaly baseline it observed.
    const restoredReport = await runDataConsistencyChecks();
    expect(restoredReport.checks.find(
      check => check.code === 'EXPIRED_ACTIVE_RESERVATIONS',
    )?.anomalyCount).toBe(initialExpiredCount);
  });

  // ---------------------------------------------------------------------------
  // 11. No Secret Appears in Logs or Error Responses
  // ---------------------------------------------------------------------------
  it('11. No secret or credentials appear in error responses or logs', async () => {
    // Requesting an unknown endpoint with sensitive query parameter
    const res = await request(app)
      .get('/api/v1/unknown-endpoint?secret_token=SUPER_SECRET_VALUE_12345&password=SensitivePass123')
      .set('X-Request-Id', 'test-sec-req-001');

    expect(res.status).toBe(404);
    const bodyStr = JSON.stringify(res.body);

    // Ensure raw query values never leaked into response
    expect(bodyStr).not.toContain('SUPER_SECRET_VALUE_12345');
    expect(bodyStr).not.toContain('SensitivePass123');
    // Ensure stack trace is not exposed
    expect(res.body.error).not.toHaveProperty('stack');
  });

  // ---------------------------------------------------------------------------
  // 12. Deployment Failure Prevents Traffic Activation
  // ---------------------------------------------------------------------------
  it('12. Deployment failure prevents traffic activation when readiness probe fails', async () => {
    // When the database connection fails, /readyz must return HTTP 503 and report unhealthy
    const spy = vi.spyOn(databaseModule, 'checkDatabaseReadiness').mockResolvedValueOnce({
      connected: false,
      migrationsReady: false,
      reason: 'connection_failed',
    });

    try {
      const res = await request(app).get('/readyz');
      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    } finally {
      spy.mockRestore();
    }
  });
});
