import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { Express } from 'express';
import { createLimiter } from './rate-limit.middleware.js';
import helmet from 'helmet';
import { env } from '../config/env.js';

import { ForbiddenError } from '../utils/errors.js';

function isDevOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      origin === env.FRONTEND_URL
    );
  } catch {
    return false;
  }
}

export function applySecurityMiddleware(app: Express): void {
  // Security HTTP Headers
  app.use(helmet());

  // CORS Configuration
  const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean);
  if (allowedOrigins.includes('*')) {
    throw new Error('CORS_ORIGIN cannot use wildcard * with credentialed authentication.');
  }

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        if (!requestOrigin) return callback(null, true);
        if (allowedOrigins.includes(requestOrigin) || (['development', 'test'].includes(env.NODE_ENV) && isDevOrigin(requestOrigin))) {
          return callback(null, true);
        }
        return callback(new ForbiddenError('Not allowed by CORS', 'CORS_NOT_ALLOWED'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token', 'Idempotency-Key'],
    }),
  );

  // Rate Limiting
  const limiter = createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    prodMax: 100,
    testMax: 50000,
    allowTestLimitOverride: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later.',
  });
  app.use('/api', (req, res, next) => {
    // Exempt cryptographically verified payment provider callbacks and webhooks
    if (req.path.includes('/payments/') && (req.path.includes('callback') || req.path.includes('webhook'))) {
      return next();
    }
    return limiter(req, res, next);
  });
  app.use(cookieParser());


  // JSON Body Parser with reasonable size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
}
