import argon2 from 'argon2';
import { AccountStatus, EmailVerificationPurpose, UserRole } from '../generated/prisma/client.js';
import { getPrismaClient } from '../config/database.js';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { createSecret, hashSecret, normalizeEmail, RESET_TOKEN_TTL_MS, TOKEN_TTL_MS } from '../utils/auth.js';
import type { AuthEmailSender } from './email.service.js';
import { ResendAuthEmailSender } from './email.service.js';

const hashOptions = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };
const publicUser = (user: { id: string; email: string; firstName: string; lastName: string; role: UserRole; status: AccountStatus; emailVerifiedAt: Date | null }) => ({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role.toLowerCase(), status: user.status.toLowerCase(), emailVerified: Boolean(user.emailVerifiedAt) });
export type PublicUser = ReturnType<typeof publicUser>;

export class AuthService {
  constructor(private readonly emailSender: AuthEmailSender = new ResendAuthEmailSender()) {}
  private async verification(userId: string, purpose: EmailVerificationPurpose, email: string): Promise<void> {
    const raw = createSecret();
    await this.emailSender.sendVerification(email, raw);
    const prisma = getPrismaClient(); const now = new Date();
    await prisma.$transaction([
      prisma.emailVerificationToken.updateMany({ where: { userId, purpose, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } }),
      prisma.emailVerificationToken.create({ data: { userId, tokenHash: hashSecret(raw), purpose, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) } }),
    ]);
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
    return { user: publicUser(user), sessionToken: await this.createSession(user.id, input.rememberMe) };
  }
  async createSession(userId: string, rememberMe = false): Promise<string> { const raw = createSecret(); await getPrismaClient().session.create({ data: { userId, tokenHash: hashSecret(raw), expiresAt: new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000) } }); return raw; }
  async me(userId: string): Promise<PublicUser> { const user = await getPrismaClient().user.findUnique({ where: { id: userId } }); if (!user) throw new UnauthorizedError(); return publicUser(user); }
  async logout(token?: string): Promise<void> { if (token) await getPrismaClient().session.updateMany({ where: { tokenHash: hashSecret(token), revokedAt: null }, data: { revokedAt: new Date() } }); }
  async verify(token: string): Promise<void> { const prisma = getPrismaClient(); const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashSecret(token) }, include: { user: true } }); if (!record || record.usedAt || record.expiresAt <= new Date()) throw new NotFoundError('Verification link is invalid or expired.', 'INVALID_VERIFICATION_TOKEN'); await prisma.$transaction([prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }), prisma.user.update({ where: { id: record.userId }, data: record.purpose === EmailVerificationPurpose.EMAIL_CHANGE ? { email: record.user.pendingEmail ?? record.user.email, pendingEmail: null, emailVerifiedAt: new Date() } : { emailVerifiedAt: new Date() } })]); }
  async forgot(emailInput: string): Promise<void> { const prisma = getPrismaClient(); const user = await prisma.user.findUnique({ where: { email: normalizeEmail(emailInput) } }); if (!user || user.status !== AccountStatus.ACTIVE) return; const raw = createSecret(); await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashSecret(raw), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) } }); try { await this.emailSender.sendPasswordReset(user.email, raw); } catch { /* Preserve anti-enumeration response. */ } }
  async resendVerification(emailInput: string): Promise<void> { const user = await getPrismaClient().user.findUnique({ where: { email: normalizeEmail(emailInput) } }); if (!user || user.status !== AccountStatus.ACTIVE || user.emailVerifiedAt) return; try { await this.verification(user.id, EmailVerificationPurpose.REGISTRATION, user.email); } catch { /* Preserve generic response and leave prior tokens valid. */ } }
  async reset(token: string, password: string): Promise<void> { const prisma = getPrismaClient(); const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashSecret(token) } }); if (!record || record.usedAt || record.expiresAt <= new Date()) throw new NotFoundError('Password reset link is invalid or expired.', 'INVALID_RESET_TOKEN'); await prisma.$transaction([prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await argon2.hash(password, hashOptions) } }), prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }), prisma.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } })]); }
  async update(userId: string, input: { firstName?: string; lastName?: string; email?: string }) { const prisma = getPrismaClient(); const user = await prisma.user.findUnique({ where: { id: userId } }); if (!user) throw new UnauthorizedError(); if (input.email && normalizeEmail(input.email) !== user.email) { const email = normalizeEmail(input.email); if (await prisma.user.findUnique({ where: { email } })) throw new ConflictError('Email is already in use.', 'EMAIL_ALREADY_REGISTERED'); const pending = await prisma.user.update({ where: { id: userId }, data: { firstName: input.firstName, lastName: input.lastName, pendingEmail: email } }); await this.verification(userId, EmailVerificationPurpose.EMAIL_CHANGE, email); return publicUser(pending); } return publicUser(await prisma.user.update({ where: { id: userId }, data: { firstName: input.firstName, lastName: input.lastName } })); }
}
