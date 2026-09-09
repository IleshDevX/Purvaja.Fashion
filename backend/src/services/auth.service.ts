import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { AccountStatus, EmailVerificationPurpose, UserRole } from '../generated/prisma/client.js';
import { getPrismaClient } from '../config/database.js';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { createSecret, hashSecret, normalizeEmail, RESET_TOKEN_TTL_MS, TOKEN_TTL_MS } from '../utils/auth.js';
import type { AuthEmailSender } from './email.service.js';
import { ResendAuthEmailSender } from './email.service.js';

const hashOptions = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };
const publicUser = (user: { id: string; email: string; firstName: string; lastName: string; phone: string | null; preferredFit: string | null; preferredCollar: string | null; pendingEmail: string | null; role: UserRole; status: AccountStatus; emailVerifiedAt: Date | null }) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  preferredFit: user.preferredFit,
  preferredCollar: user.preferredCollar,
  pendingEmail: user.pendingEmail,
  role: user.role.toLowerCase(),
  status: user.status.toLowerCase(),
  emailVerified: Boolean(user.emailVerifiedAt),
});
export type PublicUser = ReturnType<typeof publicUser>;

export class AuthService {
  constructor(private readonly emailSender: AuthEmailSender = new ResendAuthEmailSender()) {}
  private async verification(userId: string, purpose: EmailVerificationPurpose, email: string): Promise<void> {
    const raw = createSecret();
    const id = randomUUID();
    const prisma = getPrismaClient();
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: userId } });
      const expected = purpose === EmailVerificationPurpose.EMAIL_CHANGE ? user?.pendingEmail : user?.email;
      if (!user || user.status !== AccountStatus.ACTIVE || expected !== email) throw new UnauthorizedError();
      await tx.emailVerificationToken.create({ data: {
        id, userId, tokenHash: hashSecret(raw), purpose, targetEmail: email,
        deliveryPending: true, expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      } });
    });
    try {
      await this.emailSender.sendVerification(email, raw, `auth-verification/${id}`);
    } catch (error) {
      await prisma.emailVerificationToken.deleteMany({ where: { id, deliveryPending: true } });
      throw error;
    }
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: userId } });
      const candidate = await tx.emailVerificationToken.findUnique({ where: { id } });
      const expected = purpose === EmailVerificationPurpose.EMAIL_CHANGE ? user?.pendingEmail : user?.email;
      if (!candidate || !candidate.deliveryPending || expected !== email) {
        await tx.emailVerificationToken.deleteMany({ where: { id, deliveryPending: true } });
        throw new UnauthorizedError();
      }
      const newerDelivered = await tx.emailVerificationToken.findFirst({ where: {
        userId, purpose, deliveryPending: false, usedAt: null, createdAt: { gt: candidate.createdAt },
      } });
      if (newerDelivered) {
        await tx.emailVerificationToken.delete({ where: { id } });
        return;
      }
      const now = new Date();
      await tx.emailVerificationToken.updateMany({
        where: { userId, purpose, id: { not: id }, deliveryPending: false, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      await tx.emailVerificationToken.update({ where: { id }, data: { deliveryPending: false } });
    });
  }
  async register(input: { firstName: string; lastName: string; email: string; password: string; phone?: string }) {
    const prisma = getPrismaClient(); const email = normalizeEmail(input.email);
    if (await prisma.user.findUnique({ where: { email } })) throw new ConflictError('Unable to create account.', 'EMAIL_ALREADY_REGISTERED');
    const user = await prisma.user.create({ data: { firstName: input.firstName, lastName: input.lastName, phone: input.phone, email, passwordHash: await argon2.hash(input.password, hashOptions), role: UserRole.CUSTOMER } });
    try { await this.verification(user.id, EmailVerificationPurpose.REGISTRATION, user.email); } catch { return { user: publicUser(user), emailSent: false }; }
    return { user: publicUser(user), emailSent: true };
  }
  async login(input: { email: string; password: string; rememberMe?: boolean }) {
    const user = await getPrismaClient().user.findUnique({ where: { email: normalizeEmail(input.email) } });
    if (!user || !(await argon2.verify(user.passwordHash, input.password))) throw new UnauthorizedError('Invalid email or password.', 'INVALID_CREDENTIALS');
    if (user.status !== AccountStatus.ACTIVE) throw new ForbiddenError('This account is not available.', 'ACCOUNT_UNAVAILABLE');
    const session = await this.createSession(user.id, input.rememberMe, user.passwordHash, user.email);
    return { user: publicUser(user), sessionToken: session.sessionToken, maxAgeMs: session.maxAgeMs };
  }
  async createSession(userId: string, rememberMe = false, expectedPasswordHash?: string, expectedEmail?: string): Promise<{ sessionToken: string; maxAgeMs: number }> {
    const raw = createSecret();
    const maxAgeMs = (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000;
    await getPrismaClient().$transaction(async tx => {
      // A reset/email change and session issuance share the account lock.
      // Credentials checked before a reset cannot create a session after it.
      await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.status !== AccountStatus.ACTIVE ||
          (expectedPasswordHash !== undefined && user.passwordHash !== expectedPasswordHash) ||
          (expectedEmail !== undefined && user.email !== expectedEmail)) {
        throw new UnauthorizedError('Please sign in again.', 'INVALID_CREDENTIALS');
      }
      await tx.session.create({
      data: {
        userId,
        tokenHash: hashSecret(raw),
        expiresAt: new Date(Date.now() + maxAgeMs),
      },
      });
    });
    return { sessionToken: raw, maxAgeMs };
  }
  async me(userId: string): Promise<PublicUser> { const user = await getPrismaClient().user.findUnique({ where: { id: userId } }); if (!user) throw new UnauthorizedError(); return publicUser(user); }
  async logout(token?: string): Promise<void> { if (token) await getPrismaClient().session.updateMany({ where: { tokenHash: hashSecret(token), revokedAt: null }, data: { revokedAt: new Date() } }); }
  async verify(token: string): Promise<void> {
    const prisma = getPrismaClient();
    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hashSecret(token) },
      include: { user: true },
    });
    const now = new Date();
    if (!record || record.deliveryPending || record.usedAt || record.expiresAt <= now) {
      throw new NotFoundError('Verification link is invalid or expired.', 'INVALID_VERIFICATION_TOKEN');
    }

    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${record.userId}::uuid FOR UPDATE`;
      const currentUser = await tx.user.findUniqueOrThrow({ where: { id: record.userId } });
      const now = new Date();
      if (record.purpose === EmailVerificationPurpose.REGISTRATION &&
          (!record.targetEmail || record.targetEmail !== currentUser.email)) {
        throw new NotFoundError('Verification link is invalid or expired.', 'INVALID_VERIFICATION_TOKEN');
      }
      if (record.purpose === EmailVerificationPurpose.EMAIL_CHANGE &&
          (!record.targetEmail || record.targetEmail !== currentUser.pendingEmail)) {
        throw new NotFoundError('Verification link is invalid or expired.', 'INVALID_VERIFICATION_TOKEN');
      }
      const consumed = await tx.emailVerificationToken.updateMany({
        where: { id: record.id, deliveryPending: false, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) {
        throw new NotFoundError('Verification link is invalid or expired.', 'INVALID_VERIFICATION_TOKEN');
      }
      await tx.user.update({
        where: { id: record.userId },
        data: record.purpose === EmailVerificationPurpose.EMAIL_CHANGE
          ? { email: record.targetEmail!, pendingEmail: null, emailVerifiedAt: now }
          : { emailVerifiedAt: now },
      });
      if (record.purpose === EmailVerificationPurpose.EMAIL_CHANGE) {
        await tx.emailVerificationToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: now } });
        await tx.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: now } });
        await tx.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: now } });
      }
    });
  }
  async forgot(emailInput: string): Promise<void> {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { email: normalizeEmail(emailInput) } });
    if (!user || user.status !== AccountStatus.ACTIVE) return;
    const raw = createSecret();
    const id = randomUUID();
    const issued = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${user.id}::uuid FOR UPDATE`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current || current.status !== AccountStatus.ACTIVE || current.email !== user.email || current.passwordHash !== user.passwordHash) return false;
      await tx.passwordResetToken.create({ data: {
        id, userId: user.id, tokenHash: hashSecret(raw), deliveryPending: true,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      } });
      return true;
    });
    if (!issued) return;
    try {
      await this.emailSender.sendPasswordReset(user.email, raw, `password-reset/${id}`);
      await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${user.id}::uuid FOR UPDATE`;
        const current = await tx.user.findUnique({ where: { id: user.id } });
        const candidate = await tx.passwordResetToken.findUnique({ where: { id } });
        if (!candidate || !candidate.deliveryPending || !current || current.status !== AccountStatus.ACTIVE ||
            current.email !== user.email || current.passwordHash !== user.passwordHash) {
          await tx.passwordResetToken.deleteMany({ where: { id, deliveryPending: true } });
          return;
        }
        const newerDelivered = await tx.passwordResetToken.findFirst({ where: {
          userId: user.id, deliveryPending: false, usedAt: null, createdAt: { gt: candidate.createdAt },
        } });
        if (newerDelivered) {
          await tx.passwordResetToken.delete({ where: { id } });
          return;
        }
        const now = new Date();
        await tx.passwordResetToken.updateMany({
          where: { userId: user.id, id: { not: id }, deliveryPending: false, usedAt: null, expiresAt: { gt: now } },
          data: { usedAt: now },
        });
        await tx.passwordResetToken.update({ where: { id }, data: { deliveryPending: false } });
      });
    } catch {
      await prisma.passwordResetToken.deleteMany({ where: { id, deliveryPending: true } });
      // Preserve the generic anti-enumeration response.
    }
  }
  async resendVerification(emailInput: string): Promise<void> { const user = await getPrismaClient().user.findUnique({ where: { email: normalizeEmail(emailInput) } }); if (!user || user.status !== AccountStatus.ACTIVE || user.emailVerifiedAt) return; try { await this.verification(user.id, EmailVerificationPurpose.REGISTRATION, user.email); } catch { /* Preserve generic response and leave prior tokens valid. */ } }
  async reset(token: string, password: string): Promise<void> {
    const prisma = getPrismaClient();
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashSecret(token) } });
    const now = new Date();
    if (!record || record.deliveryPending || record.usedAt || record.expiresAt <= now) {
      throw new NotFoundError('Password reset link is invalid or expired.', 'INVALID_RESET_TOKEN');
    }
    const passwordHash = await argon2.hash(password, hashOptions);
    await prisma.$transaction(async tx => {
      // Serialize sibling resets on the account before touching individual
      // tokens, so concurrent links cannot each replace the new password.
      await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${record.userId}::uuid FOR UPDATE`;
      const now = new Date();
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, deliveryPending: false, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) {
        throw new NotFoundError('Password reset link is invalid or expired.', 'INVALID_RESET_TOKEN');
      }
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
      await tx.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: now } });
      await tx.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: now } });
    });
  }
  async update(userId: string, input: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string | null;
    preferredFit?: 'Slim' | 'Regular' | 'Relaxed' | null;
    preferredCollar?: 'Spread Collar' | 'Button-Down Collar' | 'Mandarin Collar' | 'Cuban Collar' | 'Cutaway Collar' | null;
  }) {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError();

    if (input.email && normalizeEmail(input.email) !== user.email) {
      const email = normalizeEmail(input.email);
      if (await prisma.user.findUnique({ where: { email } })) {
        throw new ConflictError('Email is already in use.', 'EMAIL_ALREADY_REGISTERED');
      }

      await prisma.user.update({ where: { id: userId }, data: { pendingEmail: email } });
      try {
        await this.verification(userId, EmailVerificationPurpose.EMAIL_CHANGE, email);
      } catch (error) {
        // Roll back only the pending target established by this request. A newer
        // concurrent request must retain its own target.
        await prisma.user.updateMany({
          where: { id: userId, pendingEmail: email },
          data: { pendingEmail: user.pendingEmail },
        });
        throw error;
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        preferredFit: input.preferredFit,
        preferredCollar: input.preferredCollar,
      },
    });
    return publicUser(updated);
  }
}
