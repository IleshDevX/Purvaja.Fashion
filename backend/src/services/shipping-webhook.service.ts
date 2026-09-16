import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { env } from '../config/env.js';
import { AppError, UnauthorizedError, ValidationError } from '../utils/errors.js';

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

function requiredHeader(req: Request, name: string): string {
  const value = req.header(name)?.trim();
  if (!value) throw new UnauthorizedError(`Missing ${name} header.`, 'SHIPPING_WEBHOOK_UNAUTHORIZED');
  return value;
}

function parseTimestamp(value: string): number {
  const numeric = /^\d+$/.test(value) ? Number(value) * 1000 : Date.parse(value);
  if (!Number.isFinite(numeric)) {
    throw new ValidationError('Invalid shipping webhook timestamp.', undefined, 'INVALID_WEBHOOK_TIMESTAMP');
  }
  return numeric;
}

export interface VerifiedShippingWebhook {
  provider: string;
  eventId: string;
  rawBody: Buffer;
}

export function verifyShippingWebhook(
  req: Request,
  options: { secret?: string; provider?: string; now?: number } = {},
): VerifiedShippingWebhook {
  const secret = options.secret ?? env.SHIPPING_WEBHOOK_SECRET;
  const expectedProvider = options.provider ?? env.SHIPPING_WEBHOOK_PROVIDER;
  if (!secret) {
    throw new AppError('Shipping webhook is not configured.', 503, 'SHIPPING_WEBHOOK_UNAVAILABLE');
  }
  const signatureHeader = requiredHeader(req, 'X-Shipping-Signature');
  const timestampHeader = requiredHeader(req, 'X-Shipping-Timestamp');
  const eventId = requiredHeader(req, 'X-Shipping-Event-Id');
  const provider = requiredHeader(req, 'X-Shipping-Provider');
  if (provider !== expectedProvider) {
    throw new UnauthorizedError('Shipping webhook provider is not authorized.', 'SHIPPING_WEBHOOK_UNAUTHORIZED');
  }
  if (!req.rawBody) {
    throw new ValidationError('Shipping webhook body is unavailable for verification.', undefined, 'WEBHOOK_BODY_UNAVAILABLE');
  }
  if (Math.abs((options.now ?? Date.now()) - parseTimestamp(timestampHeader)) > MAX_CLOCK_SKEW_MS) {
    throw new UnauthorizedError('Shipping webhook timestamp is outside the accepted window.', 'SHIPPING_WEBHOOK_EXPIRED');
  }

  const suppliedHex = signatureHeader.replace(/^sha256=/i, '');
  const expected = createHmac('sha256', secret)
    .update(`${timestampHeader}.`)
    .update(req.rawBody)
    .digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(suppliedHex, 'hex');
  } catch {
    throw new UnauthorizedError('Invalid shipping webhook signature.', 'SHIPPING_WEBHOOK_UNAUTHORIZED');
  }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new UnauthorizedError('Invalid shipping webhook signature.', 'SHIPPING_WEBHOOK_UNAUTHORIZED');
  }
  return { provider, eventId, rawBody: req.rawBody };
}
