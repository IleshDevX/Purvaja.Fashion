import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { getPrismaClient } from '../../src/config/database.js';
import { env, getDatabaseUrl } from '../../src/config/env.js';
import { CSRF_COOKIE, SESSION_COOKIE } from '../../src/utils/auth.js';

const prisma = getPrismaClient();
const password = 'SecurePassword123';
const customerEmailA = `sec-cust-a-${randomUUID()}@example.invalid`;
const customerEmailB = `sec-cust-b-${randomUUID()}@example.invalid`;

let customerAId = '';
let customerBId = '';
let customerAAgent: ReturnType<typeof request.agent>;
let customerBAgent: ReturnType<typeof request.agent>;
let customerACsrf = '';
let orderAId = '';

beforeAll(async () => {
  const [custA, custB] = await Promise.all([
    prisma.user.create({
      data: {
        email: customerEmailA,
        passwordHash: await argon2.hash(password),
        emailVerifiedAt: new Date(),
        role: 'CUSTOMER',
      },
    }),
    prisma.user.create({
      data: {
        email: customerEmailB,
        passwordHash: await argon2.hash(password),
        emailVerifiedAt: new Date(),
        role: 'CUSTOMER',
      },
    }),
  ]);
  customerAId = custA.id;
  customerBId = custB.id;

  // Create an order owned strictly by customer A
  const orderA = await prisma.order.create({
    data: {
      userId: customerAId,
      orderNumber: `ORD-SEC-${Date.now()}`,
      status: 'PENDING',
      subtotalPaise: 150000,
      shippingChargePaise: 0,
      discountPaise: 0,
      totalPaise: 150000,
      shippingAddress: {
        recipientName: 'Customer A',
        phone: '9876543210',
        line1: '123 Atelier Way',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'IN',
      },
    },
  });
  orderAId = orderA.id;

  customerAAgent = request.agent(app);
  const loginResA = await customerAAgent.post('/api/v1/auth/login').send({ email: customerEmailA, password });
  const cookiesA = (loginResA.headers['set-cookie'] as unknown as string[]) || [];
  customerACsrf = cookiesA.find(c => c.startsWith(`${CSRF_COOKIE}=`))!.split(';')[0]!.split('=')[1]!;

  customerBAgent = request.agent(app);
  await customerBAgent.post('/api/v1/auth/login').send({ email: customerEmailB, password });
});

afterAll(async () => {
  if (orderAId) {
    await prisma.order.deleteMany({ where: { id: orderAId } });
  }
  const userIds = [customerAId, customerBId].filter(Boolean);
  if (userIds.length > 0) {
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
});

describe('Production Security & Hardening Suite', () => {
  describe('1. Authentication & Session Access Control', () => {
    it('rejects unauthenticated requests to protected endpoints with 401', async () => {
      const unauth = request(app);
      const res = await unauth.get('/api/v1/orders');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects tampered session cookies with 401', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Cookie', [`${SESSION_COOKIE}=tampered-invalid-session-token`]);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. CSRF Protection for Cookie-Authenticated Mutations', () => {
    it('rejects state-changing requests when X-CSRF-Token is omitted (403)', async () => {
      const res = await customerAAgent
        .post('/api/v1/cart/items')
        .send({ variantId: randomUUID(), quantity: 1 });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_INVALID');
    });

    it('rejects state-changing requests when X-CSRF-Token is mismatched (403)', async () => {
      const res = await customerAAgent
        .post('/api/v1/cart/items')
        .set('X-CSRF-Token', 'mismatched-forged-csrf-token')
        .send({ variantId: randomUUID(), quantity: 1 });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_INVALID');
    });
  });

  describe('3. Server-Side RBAC Enforcement', () => {
    it('strictly forbids non-admin customers from accessing admin endpoints (403)', async () => {
      const res = await customerAAgent.get('/api/v1/admin/dashboard');
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('strictly forbids non-admin customers from modifying admin inventory (403)', async () => {
      const res = await customerAAgent
        .post('/api/v1/admin/inventory/adjustments')
        .set('X-CSRF-Token', customerACsrf)
        .send({ variantId: randomUUID(), quantity: 5, type: 'RESTOCK', reason: 'hacked' });
      expect(res.status).toBe(403);
    });
  });

  describe('4. IDOR / Tenant Data Isolation', () => {
    it('prevents customer B from viewing customer A’s order (returns 404)', async () => {
      const res = await customerBAgent.get(`/api/v1/orders/${orderAId}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
    });

    it('permits customer A to view their own order (returns 200)', async () => {
      const res = await customerAAgent.get(`/api/v1/orders/${orderAId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(orderAId);
    });
  });

  describe('5. Health Checks & Probes', () => {
    it('responds to liveness probe at /health and /healthz without exposing secrets', async () => {
      for (const path of ['/health', '/healthz']) {
        const res = await request(app).get(path);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('status', 'healthy');
        expect(res.body.data).toHaveProperty('uptime');
        expect(res.body.data).toHaveProperty('environment');
        expect(res.body.data).not.toHaveProperty('DATABASE_URL');
        expect(res.body.data).not.toHaveProperty('SESSION_SECRET');
      }
    });

    it('responds to readiness probe at /health/ready and /readyz', async () => {
      for (const path of ['/health/ready', '/readyz']) {
        const res = await request(app).get(path);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('status', 'ready');
      }
    });
  });

  describe('6. Error Masking & Information Leakage Prevention', () => {
    it('returns structured JSON errors without stack traces for 404 routes', async () => {
      const res = await request(app).get('/api/v1/non-existent-endpoint');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: expect.any(String),
        },
      });
      expect(res.body).not.toHaveProperty('stack');
      expect(res.body.error).not.toHaveProperty('stack');
    });

    it('rejects malformed UUIDs cleanly without exposing SQL syntax', async () => {
      const res = await request(app).get('/api/v1/products/123-not-valid-uuid');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
      expect(res.body.error.message).not.toMatch(/SELECT|WHERE|prisma/i);
    });
  });

  describe('7. Database Security & SSL Guard', () => {
    it('prohibits sslmode=no-verify when NODE_ENV is production', () => {
      const originalEnv = env.NODE_ENV;
      const originalDb = env.DATABASE_URL;
      try {
        (env as { NODE_ENV: string }).NODE_ENV = 'production';
        (env as { DATABASE_URL?: string }).DATABASE_URL =
          'postgresql://user:pass@host:5432/db?sslmode=no-verify';
        expect(() => getDatabaseUrl()).toThrowError(/Insecure sslmode=no-verify is prohibited in production/i);
      } finally {
        (env as { NODE_ENV: string }).NODE_ENV = originalEnv;
        (env as { DATABASE_URL?: string }).DATABASE_URL = originalDb;
      }
    });

    it('enforces mandatory TLS when NODE_ENV is production and sslmode is omitted', () => {
      const originalEnv = env.NODE_ENV;
      const originalDb = env.DATABASE_URL;
      try {
        (env as { NODE_ENV: string }).NODE_ENV = 'production';
        (env as { DATABASE_URL?: string }).DATABASE_URL =
          'postgresql://user:pass@remote-host.com:5432/purvaja_prod?schema=public';
        expect(() => getDatabaseUrl()).toThrowError(/must enforce TLS/i);
      } finally {
        (env as { NODE_ENV: string }).NODE_ENV = originalEnv;
        (env as { DATABASE_URL?: string }).DATABASE_URL = originalDb;
      }
    });
  });

  describe('8. Rate Limiting Headers', () => {
    it('includes standard RateLimit headers on authentication endpoints', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'unknown@example.invalid', password: 'WrongPassword123' });
      expect(res.headers).toHaveProperty('ratelimit-limit');
      expect(res.headers).toHaveProperty('ratelimit-remaining');
    });
  });
});
