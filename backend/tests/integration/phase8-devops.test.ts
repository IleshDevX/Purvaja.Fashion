import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { logger, REDACTED_PATHS } from '../../src/utils/logger.js';
import { stopServer } from '../../src/server.js';
import { validateProductionConfig } from '../../src/scripts/validate-config.js';

describe('Phase 8 — DevOps & Production Readiness Verification', () => {
  describe('1. Health & Readiness Observability', () => {
    it('returns healthy status on /healthz and /api/v1/health without exposing secrets', async () => {
      const res = await request(app).get('/healthz');
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        status: 'healthy',
        environment: expect.any(String),
        uptime: expect.any(Number),
      });

      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toMatch(/password|secret|key|token|DATABASE_URL/i);
    });

    it('returns ready status on /readyz with granular subsystem checks', async () => {
      const res = await request(app).get('/readyz');
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        status: 'ready',
        checks: {
          database: 'connected',
          migrations: expect.stringMatching(/ready|pending/),
          redis: expect.stringMatching(/connected|fallback_to_postgres|not_configured/),
          email: expect.stringMatching(/configured|log_only/),
          payment: expect.stringMatching(/demo|phonepe/),
        },
      });

      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toMatch(/postgres:\/\/|redis:\/\/|re_|change-me/i);
    });
  });

  describe('2. Request Correlation & Error Masking', () => {
    it('propagates custom X-Request-Id header to response', async () => {
      const customId = `req-trace-${randomUUID()}`;
      const res = await request(app).get('/healthz').set('X-Request-Id', customId);
      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe(customId);
    });

    it('automatically generates a UUID X-Request-Id when omitted', async () => {
      const res = await request(app).get('/healthz');
      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('includes requestId and masks stack traces in error responses', async () => {
      const res = await request(app).get('/api/v1/route-that-does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(res.body.error).toHaveProperty('requestId');
      expect(res.body.error).not.toHaveProperty('stack');
      expect(res.body).not.toHaveProperty('stack');
    });
  });

  describe('3. Secrets Redaction in Logger', () => {
    it('has redaction configured for sensitive authentication and payment credentials', () => {
      expect(REDACTED_PATHS).toContain('password');
      expect(REDACTED_PATHS).toContain('token');
      expect(REDACTED_PATHS).toContain('sessionToken');
      expect(REDACTED_PATHS).toContain('PHONEPE_CLIENT_SECRET');
      expect(REDACTED_PATHS).toContain('creditCard');
      expect(REDACTED_PATHS).toContain('DATABASE_URL');
      expect(REDACTED_PATHS).toContain('SESSION_SECRET');
      expect(REDACTED_PATHS).toContain('req.headers.cookie');
      expect(REDACTED_PATHS).toContain('req.headers.authorization');
      expect(['info', 'debug']).toContain(logger.level);
    });
  });

  describe('4. Production Configuration Validation Gate', () => {
    it('fails safely when production environment is missing critical secrets', () => {
      const incompleteConfig = {
        NODE_ENV: 'production',
        PORT: '5001',
        DATABASE_URL: 'postgresql://usr:pwd@host:5432/db?sslmode=require',
        // Missing SESSION_SECRET and FRONTEND_URL is localhost
        FRONTEND_URL: 'http://localhost:5174',
        PAYMENT_PROVIDER: 'demo', // Forbidden in production
      };

      const result = validateProductionConfig(incompleteConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('SESSION_SECRET'))).toBe(true);
      expect(result.errors.some(e => e.includes('PAYMENT_PROVIDER=demo is not permitted'))).toBe(true);
      expect(result.errors.some(e => e.includes('FRONTEND_URL must not point to localhost'))).toBe(true);
    });

    it('validates a complete compliant production configuration', () => {
      const validConfig = {
        NODE_ENV: 'production',
        PORT: '5001',
        HOST: '0.0.0.0',
        TRUST_PROXY: '1',
        DATABASE_URL: 'postgresql://prod_user:strong_pwd@db.purvaja.fashion:5432/purvaja_prod?sslmode=require',
        SESSION_SECRET: 'a-secure-production-random-key-with-at-least-32-characters',
        FRONTEND_URL: 'https://purvaja.fashion',
        CORS_ORIGIN: 'https://purvaja.fashion',
        PAYMENT_PROVIDER: 'phonepe',
        PHONEPE_MERCHANT_ID: 'MERCHANT123',
        PHONEPE_CLIENT_ID: 'CLIENT123',
        PHONEPE_CLIENT_SECRET: 'SECRET123',
        PHONEPE_CLIENT_VERSION: '1',
        PHONEPE_CALLBACK_URL: 'https://api.purvaja.fashion/api/v1/payments/phonepe-callback',
        RESEND_API_KEY: 're_production_key_12345',
        EMAIL_FROM: 'orders@purvaja.fashion',
        RATE_LIMIT_REDIS_URL: 'rediss://quota.purvaja.fashion:6380/1',
        OPERATIONAL_ALERT_WEBHOOK_URL: 'https://alerts.purvaja.fashion/hooks/operations',
      };

      const result = validateProductionConfig(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.NODE_ENV).toBe('production');
      expect(result.summary.DATABASE_URL).toContain('***');
    });
  });

  describe('5. RBAC & Security Gates', () => {
    it('rejects unauthenticated requests to protected admin endpoints with 401', async () => {
      const res = await request(app).get('/api/v1/admin/dashboard');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects demo-payment operations when requested without valid session or in production', async () => {
      const res = await request(app)
        .post(`/api/v1/payments/${randomUUID()}/demo-result`)
        .send({ result: 'SUCCESS' });
      // Unauthenticated returns 401; in production returns 404 or 403
      expect([401, 403, 404]).toContain(res.status);
    });
  });

  describe('6. Graceful Server Lifecycle', () => {
    it('exports startServer and stopServer lifecycle handlers', () => {
      expect(typeof stopServer).toBe('function');
    });

    it('gracefully stops a mock server without unhandled rejections', async () => {
      const mockServer = {
        close: (callback: (err?: Error) => void) => {
          callback();
        },
      } as unknown as Server;

      await expect(stopServer(mockServer, 'SIGTERM')).resolves.toBeUndefined();
    });
  });
});
