import type { RequestHandler } from 'express';
import { UserRole } from '../generated/prisma/client.js';
import { getPrismaClient } from '../config/database.js';
import { CSRF_COOKIE, hashSecret, SESSION_COOKIE } from '../utils/auth.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!token) throw new UnauthorizedError();
    const session = await getPrismaClient().session.findUnique({ where: { tokenHash: hashSecret(token) }, include: { user: { select: { id: true, email: true, role: true, status: true } } } });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') throw new UnauthorizedError();
    req.auth = { userId: session.user.id, email: session.user.email, role: session.user.role };
    next();
  } catch (error) { next(error); }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => { if (!req.auth) return next(new UnauthorizedError()); if (!roles.includes(req.auth.role)) return next(new ForbiddenError()); return next(); };
}

export const requireCsrf: RequestHandler = (req, _res, next) => {
  const header = req.get('X-CSRF-Token');
  const cookie = req.cookies?.[CSRF_COOKIE] as string | undefined;
  if (!header || !cookie || header !== cookie) return next(new ForbiddenError('Invalid CSRF token.', 'CSRF_INVALID'));
  next();
};
