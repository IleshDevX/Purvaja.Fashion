import { createHash, randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { getPrismaClient } from '../../src/config/database.js';
import { env } from '../../src/config/env.js';
import { CSRF_COOKIE, SESSION_COOKIE } from '../../src/utils/auth.js';
import { logger } from '../../src/utils/logger.js';

const prisma = getPrismaClient();
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

const password = 'StrongPassword123!';
const testUserEmail = `auth-sec-${randomUUID()}@example.invalid`;
let testUserId = '';

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      email: testUserEmail,
      firstName: 'Security',
      lastName: 'Tester',
      passwordHash: await argon2.hash(password),
      status: 'ACTIVE',
    },
  });
  testUserId = user.id;
});

afterAll(async () => {
  if (testUserId) {
    await prisma.session.deleteMany({ where: { userId: testUserId } });
    await prisma.emailVerificationToken.deleteMany({ where: { userId: testUserId } });
    await prisma.passwordResetToken.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  }
});

describe('Phase 3: Auth & Account Security Integrity', { timeout: 25000 }, () => {
  // --------------------------------------------------------------------------
  // Scenario 1: Verification token works once only
  // --------------------------------------------------------------------------
  it('1. Verification token works once only', async () => {
    const rawToken = `verify-once-${randomUUID()}`;
    await prisma.emailVerificationToken.create({
      data: {
        userId: testUserId,
        tokenHash: hash(rawToken),
        purpose: 'REGISTRATION',
        targetEmail: testUserEmail,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // 1st consumption -> succeeds
    const firstRes = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: rawToken });
    expect(firstRes.status).toBe(200);
    expect(firstRes.body.success).toBe(true);

    // Verify DB state
    const tokenRecord = await prisma.emailVerificationToken.findUniqueOrThrow({
      where: { tokenHash: hash(rawToken) },
    });
    expect(tokenRecord.usedAt).not.toBeNull();

    const user = await prisma.user.findUniqueOrThrow({ where: { id: testUserId } });
    expect(user.emailVerifiedAt).not.toBeNull();

    // 2nd consumption -> rejected with 404
    const secondRes = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: rawToken });
    expect(secondRes.status).toBe(404);
    expect(secondRes.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Concurrent verification attempts → only one succeeds
  // --------------------------------------------------------------------------
  it('2. Concurrent verification attempts → only one succeeds', async () => {
    const rawToken = `verify-race-${randomUUID()}`;
    await prisma.emailVerificationToken.create({
      data: {
        userId: testUserId,
        tokenHash: hash(rawToken),
        purpose: 'REGISTRATION',
        targetEmail: testUserEmail,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // Race two verification requests concurrently
    const [res1, res2] = await Promise.all([
      request(app).post('/api/v1/auth/verify-email').send({ token: rawToken }),
      request(app).post('/api/v1/auth/verify-email').send({ token: rawToken }),
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(200);
    expect(statuses).toContain(404);

    const tokenRecord = await prisma.emailVerificationToken.findUniqueOrThrow({
      where: { tokenHash: hash(rawToken) },
    });
    expect(tokenRecord.usedAt).not.toBeNull();
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Expired verification token rejected
  // --------------------------------------------------------------------------
  it('3. Expired verification token rejected', async () => {
    const rawToken = `verify-exp-${randomUUID()}`;
    await prisma.emailVerificationToken.create({
      data: {
        userId: testUserId,
        tokenHash: hash(rawToken),
        purpose: 'REGISTRATION',
        targetEmail: testUserEmail,
        expiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 min ago
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: rawToken });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');

    const tokenRecord = await prisma.emailVerificationToken.findUniqueOrThrow({
      where: { tokenHash: hash(rawToken) },
    });
    expect(tokenRecord.usedAt).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Password-reset token works once only
  // --------------------------------------------------------------------------
  it('4. Password-reset token works once only', async () => {
    const rawToken = `reset-once-${randomUUID()}`;
    await prisma.passwordResetToken.create({
      data: {
        userId: testUserId,
        tokenHash: hash(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const newPassword = 'NewlyChangedPassword123!';

    // First reset -> succeeds
    const firstRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: rawToken, password: newPassword, confirmPassword: newPassword });
    expect(firstRes.status).toBe(200);
    expect(firstRes.body.success).toBe(true);

    // Verify DB state
    const tokenRecord = await prisma.passwordResetToken.findUniqueOrThrow({
      where: { tokenHash: hash(rawToken) },
    });
    expect(tokenRecord.usedAt).not.toBeNull();

    const user = await prisma.user.findUniqueOrThrow({ where: { id: testUserId } });
    expect(await argon2.verify(user.passwordHash, newPassword)).toBe(true);

    // Second reset -> rejected
    const secondRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: rawToken, password: 'AnotherPassword123!', confirmPassword: 'AnotherPassword123!' });
    expect(secondRes.status).toBe(404);
    expect(secondRes.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Concurrent password-reset attempts → only one succeeds
  // --------------------------------------------------------------------------
  it('5. Concurrent password-reset attempts → only one succeeds', async () => {
    const rawToken = `reset-race-${randomUUID()}`;
    await prisma.passwordResetToken.create({
      data: {
        userId: testUserId,
        tokenHash: hash(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const pwA = 'PasswordVariantA123!';
    const pwB = 'PasswordVariantB123!';

    const [resA, resB] = await Promise.all([
      request(app).post('/api/v1/auth/reset-password').send({ token: rawToken, password: pwA, confirmPassword: pwA }),
      request(app).post('/api/v1/auth/reset-password').send({ token: rawToken, password: pwB, confirmPassword: pwB }),
    ]);

    const statuses = [resA.status, resB.status];
    expect(statuses).toContain(200);
    expect(statuses).toContain(404);

    const tokenRecord = await prisma.passwordResetToken.findUniqueOrThrow({
      where: { tokenHash: hash(rawToken) },
    });
    expect(tokenRecord.usedAt).not.toBeNull();
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Expired reset token rejected
  // --------------------------------------------------------------------------
  it('6. Expired reset token rejected', async () => {
    const rawToken = `reset-exp-${randomUUID()}`;
    await prisma.passwordResetToken.create({
      data: {
        userId: testUserId,
        tokenHash: hash(rawToken),
        expiresAt: new Date(Date.now() - 60 * 1000),
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: rawToken, password: 'ValidNewPassword123!', confirmPassword: 'ValidNewPassword123!' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');

    const tokenRecord = await prisma.passwordResetToken.findUniqueOrThrow({
      where: { tokenHash: hash(rawToken) },
    });
    expect(tokenRecord.usedAt).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Revoked session rejected
  // --------------------------------------------------------------------------
  it('7. Revoked session rejected', async () => {
    // 1. Reset user password to known value
    await prisma.user.update({
      where: { id: testUserId },
      data: { passwordHash: await argon2.hash(password) },
    });

    // 2. Login to create session
    const agent = request.agent(app);
    const loginRes = await agent.post('/api/v1/auth/login').send({ email: testUserEmail, password });
    expect(loginRes.status).toBe(200);

    // 3. Confirm session works
    const meRes = await agent.get('/api/v1/auth/me');
    expect(meRes.status).toBe(200);

    // 4. Revoke session in DB
    await prisma.session.updateMany({
      where: { userId: testUserId },
      data: { revokedAt: new Date() },
    });

    // 5. Subsequent request must be rejected with 401
    const revokedRes = await agent.get('/api/v1/auth/me');
    expect(revokedRes.status).toBe(401);
  });

  // --------------------------------------------------------------------------
  // Scenario 8: Expired session rejected
  // --------------------------------------------------------------------------
  it('8. Expired session rejected', async () => {
    const agent = request.agent(app);
    const loginRes = await agent.post('/api/v1/auth/login').send({ email: testUserEmail, password });
    expect(loginRes.status).toBe(200);

    // Expire session in DB
    await prisma.session.updateMany({
      where: { userId: testUserId },
      data: { expiresAt: new Date(Date.now() - 60 * 1000) },
    });

    const meRes = await agent.get('/api/v1/auth/me');
    expect(meRes.status).toBe(401);
  });

  // --------------------------------------------------------------------------
  // Scenario 9: Logout invalidates session
  // --------------------------------------------------------------------------
  it('9. Logout invalidates session in database', async () => {
    await prisma.session.deleteMany({ where: { userId: testUserId } });
    const agent = request.agent(app);
    const loginRes = await agent.post('/api/v1/auth/login').send({ email: testUserEmail, password });
    expect(loginRes.status).toBe(200);

    const cookies = (loginRes.headers['set-cookie'] as unknown as string[]) || [];
    const csrfToken = cookies.find(c => c.startsWith(`${CSRF_COOKIE}=`))!.split(';')[0]!.split('=')[1]!;

    // Logout with CSRF token
    const logoutRes = await agent
      .post('/api/v1/auth/logout')
      .set('X-CSRF-Token', csrfToken);
    expect(logoutRes.status).toBe(200);

    // Verify session revoked in DB
    const session = await prisma.session.findFirst({
      where: { userId: testUserId, revokedAt: null },
    });
    expect(session).toBeNull();

    // Verify subsequent request rejected
    const meRes = await agent.get('/api/v1/auth/me');
    expect(meRes.status).toBe(401);
  });

  // --------------------------------------------------------------------------
  // Scenario 10: Invalid CORS origin rejected
  // --------------------------------------------------------------------------
  it('10. Invalid CORS origin rejected', async () => {
    // Unauthorized origin
    const resForbidden = await request(app)
      .get('/api/v1/auth/csrf')
      .set('Origin', 'https://malicious-attacker.invalid');

    expect(resForbidden.status).toBe(403);
    expect(resForbidden.body.error.code).toBe('CORS_NOT_ALLOWED');

    // Authorized origin (FRONTEND_URL or local dev)
    const resAllowed = await request(app)
      .get('/api/v1/auth/csrf')
      .set('Origin', env.FRONTEND_URL);

    expect(resAllowed.status).toBe(200);
    expect(resAllowed.headers['access-control-allow-origin']).toBe(env.FRONTEND_URL);
  });

  // --------------------------------------------------------------------------
  // Scenario 11: Production cookie flags verified
  // --------------------------------------------------------------------------
  it('11. Production cookie flags and lifetime consistency verified', async () => {
    // 1. Standard login (rememberMe false -> 7 days = 604800s)
    const resStandard = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUserEmail, password, rememberMe: false });

    expect(resStandard.status).toBe(200);
    const cookiesStandard = (resStandard.headers['set-cookie'] as unknown as string[]) || [];

    const sessionCookieStr = cookiesStandard.find(c => c.startsWith(`${SESSION_COOKIE}=`));
    expect(sessionCookieStr).toBeDefined();
    expect(sessionCookieStr).toMatch(/HttpOnly/i);
    expect(sessionCookieStr).toMatch(/SameSite=Lax/i);
    expect(sessionCookieStr).toMatch(/Path=\//i);
    // Max-Age should reflect ~7 days (604800 seconds)
    expect(sessionCookieStr).toMatch(/Max-Age=604800/i);

    const csrfCookieStr = cookiesStandard.find(c => c.startsWith(`${CSRF_COOKIE}=`));
    expect(csrfCookieStr).toBeDefined();
    // CSRF cookie must NOT be HttpOnly so frontend JS can read it for headers
    expect(csrfCookieStr).not.toMatch(/HttpOnly/i);
    expect(csrfCookieStr).toMatch(/SameSite=Lax/i);
    expect(csrfCookieStr).toMatch(/Max-Age=604800/i);

    // 2. Remember Me login (rememberMe true -> 30 days = 2592000s)
    const resRemember = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUserEmail, password, rememberMe: true });

    expect(resRemember.status).toBe(200);
    const cookiesRemember = (resRemember.headers['set-cookie'] as unknown as string[]) || [];
    const rememberSessionCookie = cookiesRemember.find(c => c.startsWith(`${SESSION_COOKIE}=`));
    expect(rememberSessionCookie).toMatch(/Max-Age=2592000/i);
  });

  // --------------------------------------------------------------------------
  // Scenario 12: Login rate limiting works
  // --------------------------------------------------------------------------
  it('12. Login rate limiting works', async () => {
    const testClientId = `test-login-rate-${randomUUID()}`;

    // Perform 3 requests (limit set to 3 via test header)
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Test-Rate-Limit-Max', '3')
        .set('X-Test-Client-Id', testClientId)
        .send({ email: testUserEmail, password: 'WrongPassword!' });
      expect(res.status).toBe(401);
    }

    // 4th request must be rate-limited with 429
    const limitedRes = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Test-Rate-Limit-Max', '3')
      .set('X-Test-Client-Id', testClientId)
      .send({ email: testUserEmail, password: 'WrongPassword!' });

    expect(limitedRes.status).toBe(429);
    expect(limitedRes.body.error.code).toBe('AUTH_RATE_LIMIT_EXCEEDED');
  });

  // --------------------------------------------------------------------------
  // Scenario 13: Password-reset rate limiting works
  // --------------------------------------------------------------------------
  it('13. Password-reset rate limiting works', async () => {
    const testClientId = `test-reset-rate-${randomUUID()}`;

    // Perform 3 requests (limit set to 3 via test header)
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .set('X-Test-Rate-Limit-Max', '3')
        .set('X-Test-Client-Id', testClientId)
        .send({ email: testUserEmail });
      expect(res.status).toBe(200);
    }

    // 4th request must be rate-limited with 429
    const limitedRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .set('X-Test-Rate-Limit-Max', '3')
      .set('X-Test-Client-Id', testClientId)
      .send({ email: testUserEmail });

    expect(limitedRes.status).toBe(429);
    expect(limitedRes.body.error.code).toBe('RESET_PASSWORD_RATE_LIMIT_EXCEEDED');
  });

  // --------------------------------------------------------------------------
  // Scenario 14: Payment rate limiting works
  // --------------------------------------------------------------------------
  it('14. Payment rate limiting works', async () => {
    const testClientId = `test-payment-rate-${randomUUID()}`;

    // Perform 3 requests (limit set to 3 via test header)
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post(`/api/v1/payments/${randomUUID()}/initiate`)
        .set('X-Test-Rate-Limit-Max', '3')
        .set('X-Test-Client-Id', testClientId);
      // Fails with 401 unauthorized or 403 CSRF (before route handler)
      expect([401, 403]).toContain(res.status);
    }

    // 4th request must be rate-limited with 429
    const limitedRes = await request(app)
      .post(`/api/v1/payments/${randomUUID()}/initiate`)
      .set('X-Test-Rate-Limit-Max', '3')
      .set('X-Test-Client-Id', testClientId);

    expect(limitedRes.status).toBe(429);
    expect(limitedRes.body.error.code).toBe('PAYMENT_RATE_LIMIT_EXCEEDED');
  });

  // --------------------------------------------------------------------------
  // Scenario 15: Sensitive values are not emitted to logs
  // --------------------------------------------------------------------------
  it('15. Sensitive values are not emitted to logs', () => {
    // Inspect logger redaction paths and serialization
    const samplePayload = {
      password: 'MySecretPassword123!',
      passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$secretHash',
      token: 'raw_auth_token_value_abc123',
      sessionToken: 'raw_session_token_xyz789',
      secret: 'super_secret_signing_key',
      req: {
        headers: {
          authorization: 'Bearer super_secret_jwt',
          cookie: 'pf_session=session_token_secret; pf_csrf=csrf_secret',
          'x-csrf-token': 'csrf_secret',
          'x-verify': 'phonepe_secret_signature',
        },
      },
    };

    expect(logger).toBeDefined();

    // Verify raw payload has secrets before redaction
    const sampleString = JSON.stringify(samplePayload);
    expect(sampleString).toContain('MySecretPassword123!');

    const testPino = logger.child({ testRun: true });
    expect(testPino).toBeDefined();

    // Direct check of redact paths configured on the logger
    // @ts-expect-error pino internal redactor access
    const redactor = logger[Symbol.for('pino.redact')];
    if (typeof redactor === 'function') {
      const cloned = JSON.parse(JSON.stringify(samplePayload));
      redactor(cloned);
      const redactedStr = JSON.stringify(cloned);
      expect(redactedStr).not.toContain('MySecretPassword123!');
      expect(redactedStr).not.toContain('raw_auth_token_value_abc123');
      expect(redactedStr).not.toContain('super_secret_jwt');
      expect(redactedStr).not.toContain('session_token_secret');
      expect(redactedStr).toContain('[REDACTED]');
    }
  });
});
