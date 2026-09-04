import { createHash, randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { getPrismaClient } from '../../src/config/database.js';
import { CSRF_COOKIE } from '../../src/utils/auth.js';

const email = `auth-test-${randomUUID()}@example.invalid`;
const password = 'SecurePassword123';
let userId = '';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

afterAll(async () => { if (userId) { const prisma = getPrismaClient(); await prisma.session.deleteMany({ where: { userId } }); await prisma.emailVerificationToken.deleteMany({ where: { userId } }); await prisma.passwordResetToken.deleteMany({ where: { userId } }); await prisma.user.delete({ where: { id: userId } }); } });

describe('custom authentication', () => {
  it('registers only a customer and never exposes password or token fields', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({ firstName: 'Auth', lastName: 'Tester', email, password, confirmPassword: password, role: 'ADMIN' });
    expect(response.status).toBe(201); userId = response.body.data.user.id;
    expect(response.body.data.user.role).toBe('customer');
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|tokenHash|sessionToken/i);
    const stored = await getPrismaClient().user.findUniqueOrThrow({ where: { id: userId } });
    expect(stored.passwordHash).not.toBe(password);
  });

  it('rejects weak passwords and duplicate registrations', async () => {
    const [weak, duplicate] = await Promise.all([
      request(app).post('/api/v1/auth/register').send({ firstName: 'A', lastName: 'B', email: `weak-${randomUUID()}@example.invalid`, password: 'weak', confirmPassword: 'weak' }),
      request(app).post('/api/v1/auth/register').send({ firstName: 'A', lastName: 'B', email, password, confirmPassword: password }),
    ]);
    expect(weak.status).toBe(400); expect(duplicate.status).toBe(409);
  });

  it('creates a hashed server session, supports me, CSRF-protected logout, and revoked sessions', async () => {
    const agent = request.agent(app);
    const login = await agent.post('/api/v1/auth/login').send({ email: email.toUpperCase(), password });
    const setCookie = (login.headers['set-cookie'] as unknown as string[]) || [];
    expect(login.status).toBe(200); expect(setCookie.join(';')).toMatch(/HttpOnly/);
    const me = await agent.get('/api/v1/auth/me'); expect(me.status).toBe(200); expect(me.body.data.user.email).toBe(email);
    const csrf = setCookie.find(cookie => cookie.startsWith(`${CSRF_COOKIE}=`))!.split(';')[0]!.split('=')[1]!;
    expect((await agent.post('/api/v1/auth/logout')).status).toBe(403);
    expect((await agent.post('/api/v1/auth/logout').set('X-CSRF-Token', csrf)).status).toBe(200);
    expect((await agent.get('/api/v1/auth/me')).status).toBe(401);
  });

  it('consumes verification and reset tokens and revokes existing sessions on reset', async () => {
    const prisma = getPrismaClient();
    const verification = `verify-${randomUUID()}-${randomUUID()}`;
    await prisma.emailVerificationToken.create({ data: { userId, tokenHash: hash(verification), expiresAt: new Date(Date.now() + 60000), purpose: 'REGISTRATION' } });
    expect((await request(app).post('/api/v1/auth/verify-email').send({ token: verification })).status).toBe(200);
    expect((await request(app).post('/api/v1/auth/verify-email').send({ token: verification })).status).toBe(404);
    const reset = `reset-${randomUUID()}-${randomUUID()}`;
    await prisma.passwordResetToken.create({ data: { userId, tokenHash: hash(reset), expiresAt: new Date(Date.now() + 60000) } });
    expect((await request(app).post('/api/v1/auth/reset-password').send({ token: reset, password: 'NewSecurePassword123', confirmPassword: 'NewSecurePassword123' })).status).toBe(200);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } }); expect(await argon2.verify(user.passwordHash, 'NewSecurePassword123')).toBe(true);
  });
});
