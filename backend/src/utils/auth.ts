import { createHash, randomBytes } from 'node:crypto';

export const SESSION_COOKIE = 'pf_session';
export const CSRF_COOKIE = 'pf_csrf';
export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export function createSecret(): string { return randomBytes(32).toString('base64url'); }
export function hashSecret(secret: string): string { return createHash('sha256').update(secret).digest('hex'); }
export function normalizeEmail(email: string): string { return email.trim().toLowerCase(); }
