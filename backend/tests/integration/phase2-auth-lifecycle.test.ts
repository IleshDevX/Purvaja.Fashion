import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { getPrismaClient } from '../../src/config/database.js';
import { AuthService } from '../../src/services/auth.service.js';
import type { AuthEmailSender } from '../../src/services/email.service.js';
import { hashSecret } from '../../src/utils/auth.js';

const prisma = getPrismaClient();
const service = new AuthService();
const email = `phase2-${randomUUID()}@example.invalid`;
let userId: string;
beforeAll(async () => { userId = (await prisma.user.create({ data: { email, passwordHash: 'unused' } })).id; });
afterAll(async () => {
  if (!userId) return;
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
});

it('rejects registration tokens with missing or stale target emails', async () => {
  for (const targetEmail of [null, 'old@example.invalid']) {
    const token = randomUUID();
    await prisma.emailVerificationToken.create({ data: { userId, targetEmail, tokenHash: hashSecret(token), purpose: 'REGISTRATION', expiresAt: new Date(Date.now() + 60000) } });
    await expect(service.verify(token)).rejects.toMatchObject({ code: 'INVALID_VERIFICATION_TOKEN' });
  }
  expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).emailVerifiedAt).toBeNull();
});

it('allows only one concurrent sibling reset and revokes every existing session', async () => {
  const oldPasswordHash = (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).passwordHash;
  const tokens = [randomUUID(), randomUUID()];
  await prisma.passwordResetToken.createMany({ data: tokens.map(token => ({ userId, tokenHash: hashSecret(token), expiresAt: new Date(Date.now() + 60000) })) });
  await service.createSession(userId);
  const results = await Promise.allSettled(tokens.map(token => service.reset(token, 'ChangedPassword123!')));
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(await prisma.passwordResetToken.count({ where: { userId, usedAt: null } })).toBe(0);
  expect(await prisma.session.count({ where: { userId, revokedAt: null } })).toBe(0);
  await expect(service.createSession(userId, false, oldPasswordHash)).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
});

it('binds email-change links and revokes recovery links and sessions on completion', async () => {
  const targetEmail = `changed-${randomUUID()}@example.invalid`;
  await prisma.user.update({ where: { id: userId }, data: { pendingEmail: targetEmail } });
  const token = randomUUID();
  await prisma.emailVerificationToken.create({ data: { userId, targetEmail, tokenHash: hashSecret(token), purpose: 'EMAIL_CHANGE', expiresAt: new Date(Date.now() + 60000) } });
  await prisma.passwordResetToken.create({ data: { userId, tokenHash: hashSecret(randomUUID()), expiresAt: new Date(Date.now() + 60000) } });
  await service.createSession(userId);
  await service.verify(token);
  expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).email).toBe(targetEmail);
  await expect(service.createSession(userId, false, undefined, email)).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  expect(await prisma.passwordResetToken.count({ where: { userId, usedAt: null } })).toBe(0);
  expect(await prisma.session.count({ where: { userId, revokedAt: null } })).toBe(0);
  await expect(service.verify(token)).rejects.toMatchObject({ code: 'INVALID_VERIFICATION_TOKEN' });
});

it('activates reset links only after an idempotent provider acceptance', async () => {
  let deliveredToken = '';
  let deliveredKey = '';
  let observedPending = false;
  const mailer: AuthEmailSender = {
    async sendVerification() {},
    async sendPasswordReset(_recipient, token, idempotencyKey) {
      deliveredToken = token;
      deliveredKey = idempotencyKey ?? '';
      const candidate = await prisma.passwordResetToken.findUniqueOrThrow({ where: { tokenHash: hashSecret(token) } });
      observedPending = candidate.deliveryPending;
      await expect(deliveryService.reset(token, 'PrematurePassword123!')).rejects.toMatchObject({ code: 'INVALID_RESET_TOKEN' });
    },
  };
  const deliveryService = new AuthService(mailer);
  const current = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  await deliveryService.forgot(current.email);
  const candidate = await prisma.passwordResetToken.findUniqueOrThrow({ where: { tokenHash: hashSecret(deliveredToken) } });
  expect(observedPending).toBe(true);
  expect(candidate.deliveryPending).toBe(false);
  expect(deliveredKey).toBe(`password-reset/${candidate.id}`);
  await deliveryService.reset(deliveredToken, 'DeliveredPassword123!');
  expect((await prisma.passwordResetToken.findUniqueOrThrow({ where: { id: candidate.id } })).usedAt).not.toBeNull();
});

it('removes an undelivered reset candidate without invalidating an older link', async () => {
  const oldToken = randomUUID();
  const old = await prisma.passwordResetToken.create({ data: {
    userId, tokenHash: hashSecret(oldToken), expiresAt: new Date(Date.now() + 60000),
  } });
  const failing: AuthEmailSender = {
    async sendVerification() {},
    async sendPasswordReset() { throw new Error('provider unavailable'); },
  };
  const current = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  await new AuthService(failing).forgot(current.email);
  expect((await prisma.passwordResetToken.findUniqueOrThrow({ where: { id: old.id } })).usedAt).toBeNull();
  expect(await prisma.passwordResetToken.count({ where: { userId, deliveryPending: true } })).toBe(0);
});
