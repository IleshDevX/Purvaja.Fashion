import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { getPrismaClient } from '../../src/config/database.js';
import { AuthService } from '../../src/services/auth.service.js';
import type { AuthEmailSender } from '../../src/services/email.service.js';
import { hashSecret, TOKEN_TTL_MS } from '../../src/utils/auth.js';

const userIds: string[] = [];
const createUser = async (verified = false) => {
  const id = randomUUID(); userIds.push(id);
  return getPrismaClient().user.create({ data: { id, firstName: 'Resend', lastName: 'Test', email: `resend-${id}@example.invalid`, passwordHash: await argon2.hash('SecurePassword123'), emailVerifiedAt: verified ? new Date() : null } });
};
const sender = (): AuthEmailSender & { tokens: string[]; keys: string[]; fail: boolean } => ({
  tokens: [], keys: [], fail: false,
  async sendVerification(_email, token, idempotencyKey) {
    if (this.fail) throw new Error('provider failed');
    this.tokens.push(token);
    if (idempotencyKey) this.keys.push(idempotencyKey);
  },
  async sendPasswordReset() {},
});

afterAll(async () => { const prisma = getPrismaClient(); await prisma.session.deleteMany({ where: { userId: { in: userIds } } }); await prisma.emailVerificationToken.deleteMany({ where: { userId: { in: userIds } } }); await prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } }); await prisma.user.deleteMany({ where: { id: { in: userIds } } }); });

describe('resend verification', () => {
  it('creates a 24-hour hashed token and invalidates prior tokens only after delivery', async () => {
    const user = await createUser(); const mailer = sender(); const service = new AuthService(mailer);
    const old = 'old-token'; await getPrismaClient().emailVerificationToken.create({ data: { userId: user.id, tokenHash: hashSecret(old), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) } });
    await service.resendVerification(user.email);
    const tokens = await getPrismaClient().emailVerificationToken.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } });
    expect(mailer.tokens).toHaveLength(1); expect(mailer.keys[0]).toBe(`auth-verification/${tokens[1]!.id}`); expect(tokens[0]!.usedAt).not.toBeNull(); expect(tokens[1]!.deliveryPending).toBe(false); expect(tokens[1]!.tokenHash).toBe(hashSecret(mailer.tokens[0]!)); expect(tokens[1]!.tokenHash).not.toBe(mailer.tokens[0]); expect(tokens[1]!.expiresAt.getTime()).toBeGreaterThan(Date.now() + TOKEN_TTL_MS - 5000);
  });

  it('preserves prior active tokens when provider delivery fails or is unavailable', async () => {
    const user = await createUser(); const mailer = sender(); mailer.fail = true; const service = new AuthService(mailer);
    const old = await getPrismaClient().emailVerificationToken.create({ data: { userId: user.id, tokenHash: hashSecret('still-valid'), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) } });
    await service.resendVerification(user.email);
    expect((await getPrismaClient().emailVerificationToken.findUniqueOrThrow({ where: { id: old.id } })).usedAt).toBeNull();
    expect(await getPrismaClient().emailVerificationToken.count({ where: { userId: user.id, deliveryPending: true } })).toBe(0);
  });

  it('rolls back an email-change target when its verification email is not delivered', async () => {
    const user = await createUser();
    const mailer = sender();
    mailer.fail = true;
    const service = new AuthService(mailer);

    await expect(service.update(user.id, {
      firstName: 'ShouldNotPersist',
      email: `undelivered-${randomUUID()}@example.invalid`,
    })).rejects.toThrow('provider failed');

    const unchanged = await getPrismaClient().user.findUniqueOrThrow({ where: { id: user.id } });
    expect(unchanged.email).toBe(user.email);
    expect(unchanged.pendingEmail).toBeNull();
    expect(unchanged.firstName).toBe(user.firstName);
    expect(await getPrismaClient().emailVerificationToken.count({ where: { userId: user.id } })).toBe(0);
  });

  it('does not send for nonexistent or already verified accounts', async () => {
    const mailer = sender(); const service = new AuthService(mailer); const verified = await createUser(true);
    await service.resendVerification('missing@example.invalid'); await service.resendVerification(verified.email);
    expect(mailer.tokens).toHaveLength(0);
  });

  it('returns generic endpoint responses, validates input, and enforces the three-request rate limit', async () => {
    const generic = await request(app).post('/api/v1/auth/resend-verification').send({ email: `unknown-${randomUUID()}@example.invalid` });
    expect(generic.status).toBe(200); expect(JSON.stringify(generic.body)).not.toMatch(/token|resend|re_/i);
    expect((await request(app).post('/api/v1/auth/resend-verification').send({ email: 'bad' })).status).toBe(400);
    const requests = await Promise.all(Array.from({ length: 4 }, () => request(app).post('/api/v1/auth/resend-verification').send({ email: `limit-${randomUUID()}@example.invalid` })));
    expect(requests.some(response => response.status === 429)).toBe(true);
  });
});
