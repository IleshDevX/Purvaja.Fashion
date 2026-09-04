import pino from 'pino';
import { env } from '../config/env.js';

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
  redact: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["x-csrf-token"]',
    'password',
    'passwordHash',
    'token',
    'tokenHash',
    'secret',
    'sessionToken',
    'csrfToken',
    'DATABASE_URL',
    'DIRECT_URL',
    'SESSION_SECRET',
    'RESEND_API_KEY',
    'PHONEPE_CLIENT_SECRET',
    'PHONEPE_MERCHANT_ID',
  ],
});
