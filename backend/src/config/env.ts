import dotenv from 'dotenv';
import { z } from 'zod';
import { validateProductionConfig } from '../scripts/validate-config.js';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(5001),
  HOST: z.string().default('0.0.0.0'),
  TRUST_PROXY: z.string().default('loopback'),
  COOKIE_DOMAIN: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5174'),
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  FRONTEND_URL: z.string().url().default('http://localhost:5174'),
  REDIS_URL: z.string().url().optional(),
  RATE_LIMIT_REDIS_URL: z.string().url().optional(),
  WEB_CONCURRENCY: z.coerce.number().int().positive().default(1),
  OPERATIONAL_ALERT_WEBHOOK_URL: z.string().url().optional(),
  OPERATIONAL_ALERT_WEBHOOK_TOKEN: z.string().min(16).optional(),
  PAYMENT_PROVIDER: z.enum(['demo', 'phonepe']).default('demo'),
  PHONEPE_MERCHANT_ID: z.string().optional(),
  PHONEPE_CLIENT_ID: z.string().optional(),
  PHONEPE_CLIENT_SECRET: z.string().optional(),
  PHONEPE_CLIENT_VERSION: z.string().optional(),
  PHONEPE_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  PHONEPE_CALLBACK_URL: z.string().url().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
if ((env.NODE_ENV === 'production' || env.NODE_ENV === 'staging') && !env.RATE_LIMIT_REDIS_URL) {
  throw new Error('Staging and production require RATE_LIMIT_REDIS_URL so request quotas remain shared across every process and replica.');
}
if ((env.NODE_ENV === 'production' || env.NODE_ENV === 'staging') && (!env.RESEND_API_KEY || !env.EMAIL_FROM)) {
  throw new Error('Staging and production require RESEND_API_KEY and EMAIL_FROM so authentication email delivery is available.');
}
if ((env.NODE_ENV === 'production' || env.NODE_ENV === 'staging') && !env.OPERATIONAL_ALERT_WEBHOOK_URL) {
  throw new Error('Staging and production require OPERATIONAL_ALERT_WEBHOOK_URL so critical payment, refund, worker, and consistency failures reach operators.');
}

if (env.PAYMENT_PROVIDER === 'phonepe') {
  const missing = ['PHONEPE_MERCHANT_ID', 'PHONEPE_CLIENT_ID', 'PHONEPE_CLIENT_SECRET', 'PHONEPE_CLIENT_VERSION', 'PHONEPE_CALLBACK_URL']
    .filter(key => !env[key as keyof typeof env]);
  if (missing.length > 0) throw new Error(`PAYMENT_PROVIDER=phonepe requires: ${missing.join(', ')}`);
}
if (env.NODE_ENV === 'production' || env.NODE_ENV === 'staging') {
  const validation = validateProductionConfig(process.env);
  if (!validation.isValid) {
    throw new Error(`Deployment environment configuration invalid: ${validation.errors.join('; ')}`);
  }
}

export function getDatabaseUrl(): string {
  const result = z
    .string()
    .url('DATABASE_URL must be a valid PostgreSQL connection URL.')
    .refine(
      value => value.startsWith('postgresql://') || value.startsWith('postgres://'),
      'DATABASE_URL must use the postgresql:// or postgres:// protocol.',
    )
    .safeParse(env.DATABASE_URL);

  if (!result.success) {
    throw new Error(`Invalid DATABASE_URL: ${result.error.issues[0]?.message ?? 'value is required.'}`);
  }

  if (env.NODE_ENV === 'production' || env.NODE_ENV === 'staging') {
    if (result.data.toLowerCase().includes('sslmode=no-verify')) {
      throw new Error('Insecure sslmode=no-verify is prohibited in production.');
    }
    const hasSecureSsl = /sslmode=(require|verify-ca|verify-full)/i.test(result.data);
    if (!hasSecureSsl) {
      throw new Error('Insecure database connection: staging and production DATABASE_URL values must enforce TLS with sslmode=require, sslmode=verify-ca, or sslmode=verify-full.');
    }
  }

  return result.data;
}
