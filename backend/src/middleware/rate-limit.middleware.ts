import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import { env } from '../config/env.js';
import { SharedRateLimitStore } from '../services/rate-limit-store.js';

export function createLimiter(options: {
  windowMs: number;
  prodMax: number;
  testMax?: number;
  allowTestLimitOverride?: boolean;
  code: string;
  message: string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    store: env.RATE_LIMIT_REDIS_URL ? new SharedRateLimitStore(options.code, options.windowMs) : undefined,
    passOnStoreError: false,
    limit: (req: Request) => {
      const testOverride = req.get('X-Test-Rate-Limit-Max');
      if (testOverride && env.NODE_ENV === 'test' && options.allowTestLimitOverride !== false) {
        const limit = Number(testOverride);
        if (Number.isSafeInteger(limit) && limit > 0) return limit;
      }
      return env.NODE_ENV === 'test' ? (options.testMax ?? 1000) : options.prodMax;
    },
    keyGenerator: (req: Request) => {
      const testKey = env.NODE_ENV === 'test' ? req.get('X-Test-Client-Id') : undefined;
      if (testKey) {
        return testKey.split(',')[0]?.trim() || testKey;
      }
      // Express resolves req.ip using the configured trusted proxy topology.
      // Reading raw forwarding headers here bypasses that security boundary.
      return ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown', 56);
    },
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: options.code,
        message: options.message,
      },
    },
  });
}

/**
 * 1. Login Limiter
 * 5 attempts per 15 minutes per IP
 */
export const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  prodMax: 5,
  code: 'AUTH_RATE_LIMIT_EXCEEDED',
  message: 'Too many authentication attempts. Please try again later.',
});

/**
 * 2. Registration Limiter
 * 5 account creations per hour per IP
 */
export const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  prodMax: 5,
  code: 'REGISTER_RATE_LIMIT_EXCEEDED',
  message: 'Too many account registrations from this IP. Please try again later.',
});

/**
 * 3. Password Reset Limiter (Request & Submission)
 * 5 requests per 15 minutes per IP
 */
export const passwordResetLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  prodMax: 5,
  code: 'RESET_PASSWORD_RATE_LIMIT_EXCEEDED',
  message: 'Too many password reset attempts. Please try again later.',
});

/**
 * 4. Verification Resend Limiter
 * 3 requests per hour per IP
 */
export const verificationResendLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  prodMax: 3,
  testMax: 3,
  code: 'VERIFICATION_RESEND_RATE_LIMIT_EXCEEDED',
  message: 'Too many verification requests. Please try again later.',
});

/**
 * 5. Payment Limiter (Checkout & Payment Initiation)
 * 15 requests per 15 minutes per IP
 */
export const paymentLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  prodMax: 15,
  code: 'PAYMENT_RATE_LIMIT_EXCEEDED',
  message: 'Too many payment requests. Please try again later.',
});

/**
 * 6. Coupon Validation Limiter
 * 15 validations per 15 minutes per IP
 */
export const couponLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  prodMax: 15,
  code: 'COUPON_RATE_LIMIT_EXCEEDED',
  message: 'Too many coupon validation attempts. Please try again later.',
});

/**
 * 7. Review Submission Limiter
 * 10 reviews per hour per IP
 */
export const reviewLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  prodMax: 10,
  code: 'REVIEW_RATE_LIMIT_EXCEEDED',
  message: 'Too many review submissions. Please try again later.',
});

export const newsletterLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  prodMax: 10,
  code: 'NEWSLETTER_RATE_LIMIT_EXCEEDED',
  message: 'Too many newsletter requests. Please try again later.',
});
