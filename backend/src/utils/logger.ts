import pino from 'pino';
import { env } from '../config/env.js';

export const REDACTED_PATHS = [
  'password',
  '*.password',
  '*.*.password',
  'passwordConfirm',
  '*.passwordConfirm',
  '*.*.passwordConfirm',
  'passwordHash',
  '*.passwordHash',
  '*.*.passwordHash',
  'token',
  '*.token',
  '*.*.token',
  'tokenHash',
  '*.tokenHash',
  '*.*.tokenHash',
  'sessionToken',
  '*.sessionToken',
  '*.*.sessionToken',
  'csrfToken',
  '*.csrfToken',
  '*.*.csrfToken',
  'secret',
  '*.secret',
  '*.*.secret',
  'xVerify',
  '*.xVerify',
  '*.*.xVerify',
  'signature',
  '*.signature',
  '*.*.signature',
  'callbackPayload',
  '*.callbackPayload',
  '*.*.callbackPayload',
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-csrf-token"]',
  'req.headers["x-verify"]',
  'req.headers["set-cookie"]',
  'DATABASE_URL',
  'DIRECT_URL',
  'SESSION_SECRET',
  'RESEND_API_KEY',
  'PHONEPE_CLIENT_SECRET',
  'PHONEPE_MERCHANT_ID',
  'phonePeClientSecret',
  'phonePeMerchantId',
  '*.phonePeClientSecret',
  '*.phonePeMerchantId',
  'creditCard',
  '*.creditCard',
  'cardNumber',
  '*.cardNumber',
  'cvv',
  '*.cvv',
] as const;

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
  redact: {
    paths: [...REDACTED_PATHS],
    censor: '[REDACTED]',
  },
});

export type OperationalEventName =
  | 'checkout_started'
  | 'checkout_completed'
  | 'checkout_failed'
  | 'payment_initiated'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'payment_reconciled'
  | 'reservation_created'
  | 'reservation_released'
  | 'reservation_expired'
  | 'order_cancelled'
  | 'return_requested'
  | 'return_approved'
  | 'return_rejected'
  | 'return_refunded'
  | 'coupon_redeemed'
  | 'coupon_reverted'
  | 'coupon_rejected'
  | 'admin_inventory_movement';

export function logOperationalEvent(
  event: OperationalEventName,
  data: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'info',
): void {
  logger[level]({ event, ...data }, `Operational event: ${event}`);
}
