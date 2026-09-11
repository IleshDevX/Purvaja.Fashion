import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: Record<string, string>;
}

export function maskConnectionString(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const user = parsed.username ? '***' : '';
    const pass = parsed.password ? ':***@' : (user ? '@' : '');
    return `${parsed.protocol}//${user}${pass}${parsed.host}${parsed.pathname}${parsed.search}`;
  } catch {
    return 'invalid-connection-string';
  }
}

export function maskSecret(secret: string | undefined): string {
  if (!secret) return 'missing';
  return `present (${secret.length} chars)`;
}

export function validateProductionConfig(rawEnv: Record<string, string | undefined> = process.env): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const summary: Record<string, string> = {};

  const nodeEnv = rawEnv.NODE_ENV ?? 'development';
  summary.NODE_ENV = nodeEnv;

  const isProd = nodeEnv === 'production';
  const isStaging = nodeEnv === 'staging';
  const isEnforced = isProd || isStaging;
  const workers = Number(rawEnv.WEB_CONCURRENCY ?? 1);
  if (!Number.isSafeInteger(workers) || workers < 1) errors.push('WEB_CONCURRENCY must be a positive integer.');
  if (isEnforced && !rawEnv.RATE_LIMIT_REDIS_URL) {
    errors.push('RATE_LIMIT_REDIS_URL is required in production/staging so request quotas remain shared across every process and replica.');
  }
  if (rawEnv.RATE_LIMIT_REDIS_URL) {
    try {
      const url = new URL(rawEnv.RATE_LIMIT_REDIS_URL);
      if (!['redis:', 'rediss:'].includes(url.protocol)) throw new Error();
    } catch { errors.push('RATE_LIMIT_REDIS_URL must be a valid redis:// or rediss:// URL.'); }
  }
  if (isEnforced && !rawEnv.OPERATIONAL_ALERT_WEBHOOK_URL) {
    errors.push('OPERATIONAL_ALERT_WEBHOOK_URL is required in production/staging so critical failures reach operators.');
  } else if (rawEnv.OPERATIONAL_ALERT_WEBHOOK_URL) {
    try {
      const url = new URL(rawEnv.OPERATIONAL_ALERT_WEBHOOK_URL);
      if (isEnforced && url.protocol !== 'https:') throw new Error();
      summary.OPERATIONAL_ALERT_WEBHOOK_URL = `${url.protocol}//${url.host}${url.pathname}`;
    } catch {
      errors.push('OPERATIONAL_ALERT_WEBHOOK_URL must be a valid HTTPS URL in production/staging.');
    }
  }

  // 1. Port & Host
  const portNum = Number(rawEnv.PORT ?? 5001);
  if (Number.isNaN(portNum) || portNum < 1 || portNum > 65535) {
    errors.push(`PORT must be a valid port number between 1 and 65535 (received: ${rawEnv.PORT ?? 'undefined'}).`);
  } else {
    summary.PORT = String(portNum);
  }

  const host = rawEnv.HOST ?? '0.0.0.0';
  summary.HOST = host;

  // 2. Trust Proxy
  const trustProxy = rawEnv.TRUST_PROXY ?? 'loopback';
  summary.TRUST_PROXY = trustProxy;
  if (isEnforced) {
    if (trustProxy.toLowerCase() === 'true' || trustProxy === '*') {
      errors.push("Unsafe TRUST_PROXY configuration: setting TRUST_PROXY to 'true' or '*' in production/staging is prohibited due to IP spoofing risk. Specify an exact hop count (e.g., '1'), 'loopback', or trusted subnet.");
    }
  }

  // 3. Database URL
  const dbUrl = rawEnv.DATABASE_URL;
  if (!dbUrl) {
    if (isEnforced) {
      errors.push('DATABASE_URL is required in production/staging.');
    } else {
      warnings.push('DATABASE_URL is not configured; database connections will fail.');
    }
  } else {
    const dbParsed = z.string().url().safeParse(dbUrl);
    if (!dbParsed.success || (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://'))) {
      errors.push('DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql:// or postgres://.');
    } else {
      summary.DATABASE_URL = maskConnectionString(dbUrl);
      if (dbUrl.toLowerCase().includes('sslmode=no-verify')) {
        if (isEnforced) {
          errors.push('Insecure sslmode=no-verify is prohibited in production and staging environments.');
        } else {
          warnings.push('Insecure sslmode=no-verify is active. Ensure this is removed in staging and production.');
        }
      } else if (isEnforced) {
        const hasSecureSsl = /sslmode=(require|verify-ca|verify-full)/i.test(dbUrl);
        if (!hasSecureSsl) {
          errors.push(`${nodeEnv === 'production' ? 'Production' : 'Staging'} DATABASE_URL must enforce TLS with sslmode=require, sslmode=verify-ca, or sslmode=verify-full.`);
        }
      }
    }
  }

  // 3b. Direct Database URL (if provided)
  const directUrl = rawEnv.DIRECT_URL;
  if (directUrl) {
    const directParsed = z.string().url().safeParse(directUrl);
    if (!directParsed.success || (!directUrl.startsWith('postgresql://') && !directUrl.startsWith('postgres://'))) {
      errors.push('DIRECT_URL must be a valid PostgreSQL connection string starting with postgresql:// or postgres://.');
    } else {
      summary.DIRECT_URL = maskConnectionString(directUrl);
      if (directUrl.toLowerCase().includes('sslmode=no-verify')) {
        if (isEnforced) {
          errors.push('Insecure sslmode=no-verify is prohibited in DIRECT_URL for production and staging environments.');
        } else {
          warnings.push('Insecure sslmode=no-verify is active in DIRECT_URL.');
        }
      } else if (isEnforced) {
        const hasSecureSsl = /sslmode=(require|verify-ca|verify-full)/i.test(directUrl);
        if (!hasSecureSsl) {
          errors.push(`${nodeEnv === 'production' ? 'Production' : 'Staging'} DIRECT_URL must enforce TLS with sslmode=require, sslmode=verify-ca, or sslmode=verify-full.`);
        }
      }
    }
  }

  // 4. Frontend URL
  const frontendUrl = rawEnv.FRONTEND_URL ?? 'http://localhost:5174';
  const frontendParsed = z.string().url().safeParse(frontendUrl);
  if (!frontendParsed.success) {
    errors.push(`FRONTEND_URL must be a valid absolute URL (received: ${frontendUrl}).`);
  } else {
    summary.FRONTEND_URL = frontendUrl;
    if (isProd) {
      if (frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1')) {
        errors.push(`FRONTEND_URL must not point to localhost in production (received: ${frontendUrl}).`);
      }
      if (!frontendUrl.startsWith('https://')) {
        errors.push(`FRONTEND_URL in production must use HTTPS scheme (received: ${frontendUrl}).`);
      }
    }
  }

  // 6. CORS Origin
  const corsOrigin = rawEnv.CORS_ORIGIN ?? 'http://localhost:5174';
  summary.CORS_ORIGIN = corsOrigin;
  const origins = corsOrigin.split(',').map(o => o.trim()).filter(Boolean);
  if (origins.includes('*')) {
    errors.push('CORS_ORIGIN cannot use wildcard * with credentialed authentication.');
  }
  if (isProd) {
    const hasLocalhost = origins.some(o => o.includes('localhost') || o.includes('127.0.0.1'));
    if (hasLocalhost) {
      errors.push(`CORS_ORIGIN must not contain localhost in production (received: ${corsOrigin}).`);
    }
    const hasInsecureHttp = origins.some(o => o.startsWith('http://'));
    if (hasInsecureHttp) {
      errors.push(`CORS_ORIGIN in production must use HTTPS scheme only (received: ${corsOrigin}).`);
    }
  }

  // 7. Cookie Domain
  if (rawEnv.COOKIE_DOMAIN) {
    summary.COOKIE_DOMAIN = rawEnv.COOKIE_DOMAIN;
  }

  // 8. Payment Provider
  const paymentProvider = rawEnv.PAYMENT_PROVIDER ?? 'demo';
  summary.PAYMENT_PROVIDER = paymentProvider;
  if (isProd && paymentProvider === 'demo') {
    errors.push('PAYMENT_PROVIDER=demo is not permitted in production.');
  }
  if (paymentProvider === 'phonepe') {
    const requiredPhonePeKeys = [
      'PHONEPE_MERCHANT_ID',
      'PHONEPE_CLIENT_ID',
      'PHONEPE_CLIENT_SECRET',
      'PHONEPE_CLIENT_VERSION',
      'PHONEPE_CALLBACK_URL',
      'PHONEPE_WEBHOOK_USERNAME',
      'PHONEPE_WEBHOOK_PASSWORD',
    ];
    const missingKeys = requiredPhonePeKeys.filter(k => !rawEnv[k]);
    if (missingKeys.length > 0) {
      errors.push(`PAYMENT_PROVIDER=phonepe requires: ${missingKeys.join(', ')}.`);
    }

    // Reject test/prod environment mixing
    const phonepeEnv = rawEnv.PHONEPE_ENVIRONMENT ?? (isProd ? 'production' : 'sandbox');
    summary.PHONEPE_ENVIRONMENT = phonepeEnv;
    if (isProd && rawEnv.PHONEPE_ENVIRONMENT !== 'production') {
      errors.push('PHONEPE_ENVIRONMENT must be set to "production" in production environments (cannot mix test and production environments).');
    }


    // Validate PhonePe callback URL
    const callbackUrl = rawEnv.PHONEPE_CALLBACK_URL;
    if (callbackUrl) {
      const cbParsed = z.string().url().safeParse(callbackUrl);
      if (!cbParsed.success) {
        errors.push(`PHONEPE_CALLBACK_URL must be a valid absolute URL (received: ${callbackUrl}).`);
      } else if (isProd) {
        if (!callbackUrl.startsWith('https://')) {
          errors.push(`PHONEPE_CALLBACK_URL must use HTTPS in production (received: ${callbackUrl}).`);
        }
        if (callbackUrl.includes('localhost') || callbackUrl.includes('127.0.0.1')) {
          errors.push(`PHONEPE_CALLBACK_URL must not point to localhost in production (received: ${callbackUrl}).`);
        }
      }
    }
  }

  // 9. Resend Email
  if (rawEnv.EMAIL_FROM) {
    const emailParsed = z.string().email().safeParse(rawEnv.EMAIL_FROM);
    if (!emailParsed.success) {
      errors.push(`EMAIL_FROM must be a valid email address (received: ${rawEnv.EMAIL_FROM}).`);
    } else {
      summary.EMAIL_FROM = rawEnv.EMAIL_FROM;
    }
  }
  if (rawEnv.RESEND_API_KEY) {
    if (!rawEnv.RESEND_API_KEY.startsWith('re_')) {
      errors.push('RESEND_API_KEY must be a valid Resend API key starting with re_.');
    } else {
      summary.RESEND_API_KEY = 'configured (re_***)';
    }
  }
  if (isEnforced && (!rawEnv.RESEND_API_KEY || !rawEnv.EMAIL_FROM)) {
    errors.push('RESEND_API_KEY and EMAIL_FROM are required in production/staging so authentication email delivery is available.');
  }

  // 10. Redis
  if (rawEnv.REDIS_URL) {
    const redisParsed = z.string().url().safeParse(rawEnv.REDIS_URL);
    if (!redisParsed.success || (!rawEnv.REDIS_URL.startsWith('redis://') && !rawEnv.REDIS_URL.startsWith('rediss://'))) {
      errors.push('REDIS_URL must be a valid Redis connection string starting with redis:// or rediss://.');
    } else {
      summary.REDIS_URL = 'configured';
    }
  } else {
    summary.REDIS_URL = 'disabled (using PostgreSQL fallback)';
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary,
  };
}

export function runValidationCLI(): void {
  // eslint-disable-next-line no-console
  console.log('🔍 Validating application environment configuration...\n');

  const result = validateProductionConfig(process.env);

  // eslint-disable-next-line no-console
  console.log('--- Configuration Summary ---');
  for (const [key, value] of Object.entries(result.summary)) {
    // eslint-disable-next-line no-console
    console.log(`  ${key.padEnd(20)}: ${value}`);
  }
  // eslint-disable-next-line no-console
  console.log('-----------------------------\n');

  if (result.warnings.length > 0) {
    // eslint-disable-next-line no-console
    console.warn('⚠️  Warnings:');
    for (const w of result.warnings) {
      // eslint-disable-next-line no-console
      console.warn(`  - ${w}`);
    }
    // eslint-disable-next-line no-console
    console.warn('');
  }

  if (!result.isValid) {
    // eslint-disable-next-line no-console
    console.error('❌ Configuration Validation FAILED:');
    for (const err of result.errors) {
      // eslint-disable-next-line no-console
      console.error(`  - ${err}`);
    }
    // eslint-disable-next-line no-console
    console.error('\nPlease resolve the above configuration errors before deploying to production.\n');
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log('✅ Configuration contract validation PASSED. Deployment evidence is still required.\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runValidationCLI();
}
