import { describe, it, expect } from 'vitest';
import {
  validateProductionConfig,
  maskConnectionString,
  maskSecret,
} from '../../src/scripts/validate-config.js';

describe('Production Configuration Validator', () => {
  it('requires shared quotas in every production topology and validates the store URL', () => {
    expect(validateProductionConfig({ NODE_ENV: 'production' }).errors).toContain('RATE_LIMIT_REDIS_URL is required in production/staging so request quotas remain shared across every process and replica.');
    expect(validateProductionConfig({ RATE_LIMIT_REDIS_URL: 'https://invalid' }).errors).toContain('RATE_LIMIT_REDIS_URL must be a valid redis:// or rediss:// URL.');
  });
  it('requires a configured authentication email provider in staging and production', () => {
    const result = validateProductionConfig({
      NODE_ENV: 'production',
      RESEND_API_KEY: '',
      EMAIL_FROM: '',
    });
    expect(result.errors).toContain('RESEND_API_KEY and EMAIL_FROM are required in production/staging so authentication email delivery is available.');
  });
  const baseValidProdEnv: Record<string, string> = {
    NODE_ENV: 'production',
    PORT: '5001',
    HOST: '0.0.0.0',
    TRUST_PROXY: '1',
    DATABASE_URL: 'postgresql://prod_user:SuperSecretPassword123!@db.hostinger.com:5432/purvaja_prod?schema=public&sslmode=require',
    DIRECT_URL: 'postgresql://prod_user:SuperSecretPassword123!@db.hostinger.com:5432/purvaja_prod?schema=public&sslmode=require',
    CORS_ORIGIN: 'https://purvaja.fashion,https://www.purvaja.fashion',
    FRONTEND_URL: 'https://purvaja.fashion',
    PAYMENT_PROVIDER: 'phonepe',
    PHONEPE_MERCHANT_ID: 'MERCHANT123',
    PHONEPE_CLIENT_ID: 'CLIENT123',
    PHONEPE_CLIENT_SECRET: 'SECRET123',
    PHONEPE_CLIENT_VERSION: '1',
    PHONEPE_ENVIRONMENT: 'production',
    PHONEPE_CALLBACK_URL: 'https://purvaja.fashion/api/v1/payments/webhook',
    PHONEPE_WEBHOOK_USERNAME: 'purvaja-webhook',
    PHONEPE_WEBHOOK_PASSWORD: 'secure-webhook-password',
    EMAIL_FROM: 'noreply@purvaja.fashion',
    RESEND_API_KEY: 're_valid_live_key',
    RATE_LIMIT_REDIS_URL: 'rediss://quota.internal:6380/1',
    OPERATIONAL_ALERT_WEBHOOK_URL: 'https://alerts.purvaja.fashion/hooks/operations',
  };

  it('validates a complete and secure production configuration successfully', () => {
    const result = validateProductionConfig(baseValidProdEnv);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.summary.NODE_ENV).toBe('production');
  });

  it('strictly rejects sslmode=no-verify in production DATABASE_URL', () => {
    const env = {
      ...baseValidProdEnv,
      DATABASE_URL: 'postgresql://user:pass@host:5432/db?sslmode=no-verify',
    };
    const result = validateProductionConfig(env);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((err) => err.includes('sslmode=no-verify'))).toBe(true);
  });

  it('strictly rejects sslmode=no-verify in staging DATABASE_URL', () => {
    const env = {
      ...baseValidProdEnv,
      NODE_ENV: 'staging',
      PAYMENT_PROVIDER: 'demo',
      DATABASE_URL: 'postgresql://user:pass@host:5432/db?sslmode=no-verify',
    };
    const result = validateProductionConfig(env);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((err) => err.includes('sslmode=no-verify'))).toBe(true);
  });

  it('strictly rejects production DATABASE_URL when TLS sslmode is omitted', () => {
    const env = {
      ...baseValidProdEnv,
      DATABASE_URL: 'postgresql://prod_user:SuperSecretPassword123!@db.hostinger.com:5432/purvaja_prod?schema=public',
    };
    const result = validateProductionConfig(env);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((err) => err.includes('must enforce TLS with sslmode=require'))).toBe(true);
  });

  it('strictly rejects production DIRECT_URL when TLS sslmode is omitted', () => {
    const env = {
      ...baseValidProdEnv,
      DIRECT_URL: 'postgresql://prod_user:SuperSecretPassword123!@db.hostinger.com:5432/purvaja_prod?schema=public',
    };
    const result = validateProductionConfig(env);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((err) => err.includes('Production DIRECT_URL must enforce TLS'))).toBe(true);
  });

  it('rejects localhost in FRONTEND_URL when NODE_ENV is production', () => {
    const env = {
      ...baseValidProdEnv,
      FRONTEND_URL: 'http://localhost:5174',
    };
    const result = validateProductionConfig(env);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((err) => err.includes('must not point to localhost in production'))).toBe(true);
  });

  it('rejects wildcard "*" in CORS_ORIGIN', () => {
    const env = {
      ...baseValidProdEnv,
      CORS_ORIGIN: '*',
    };
    const result = validateProductionConfig(env);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((err) => err.includes('cannot use wildcard *'))).toBe(true);
  });

  it('strictly rejects PAYMENT_PROVIDER=demo in production', () => {
    const env = {
      ...baseValidProdEnv,
      PAYMENT_PROVIDER: 'demo',
    };
    const result = validateProductionConfig(env);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((err) => err.includes('PAYMENT_PROVIDER=demo is not permitted in production'))).toBe(true);
  });

  it('allows PAYMENT_PROVIDER=demo in staging or development', () => {
    const stagingEnv = {
      ...baseValidProdEnv,
      NODE_ENV: 'staging',
      PAYMENT_PROVIDER: 'demo',
      FRONTEND_URL: 'https://staging.purvaja.fashion',
      CORS_ORIGIN: 'https://staging.purvaja.fashion',
    };
    const result = validateProductionConfig(stagingEnv);
    expect(result.isValid).toBe(true);
  });

  it('strictly rejects PHONEPE_ENVIRONMENT=sandbox in production', () => {
    const env = {
      ...baseValidProdEnv,
      PHONEPE_ENVIRONMENT: 'sandbox',
    };
    const result = validateProductionConfig(env);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((err) => err.includes('PHONEPE_ENVIRONMENT must be set to "production"'))).toBe(true);
  });

  it('rejects incomplete PhonePe configuration when PAYMENT_PROVIDER=phonepe', () => {
    const env = {
      ...baseValidProdEnv,
      PHONEPE_MERCHANT_ID: '',
    };
    const result = validateProductionConfig(env);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((err) => err.includes('PAYMENT_PROVIDER=phonepe requires: PHONEPE_MERCHANT_ID'))).toBe(true);
  });

  it('strictly rejects unsafe TRUST_PROXY=true in production and staging', () => {
    const prodEnv = { ...baseValidProdEnv, TRUST_PROXY: 'true' };
    const prodResult = validateProductionConfig(prodEnv);
    expect(prodResult.isValid).toBe(false);
    expect(prodResult.errors.some((err) => err.includes('Unsafe TRUST_PROXY configuration'))).toBe(true);

    const stagingEnv = {
      ...baseValidProdEnv,
      NODE_ENV: 'staging',
      PAYMENT_PROVIDER: 'demo',
      FRONTEND_URL: 'https://staging.purvaja.fashion',
      CORS_ORIGIN: 'https://staging.purvaja.fashion',
      TRUST_PROXY: '*',
    };
    const stagingResult = validateProductionConfig(stagingEnv);
    expect(stagingResult.isValid).toBe(false);
    expect(stagingResult.errors.some((err) => err.includes('Unsafe TRUST_PROXY configuration'))).toBe(true);
  });

  it('strictly rejects non-https PHONEPE_CALLBACK_URL in production', () => {
    const env = {
      ...baseValidProdEnv,
      PHONEPE_CALLBACK_URL: 'http://purvaja.fashion/api/v1/payments/webhook',
    };
    const result = validateProductionConfig(env);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((err) => err.includes('PHONEPE_CALLBACK_URL must use HTTPS in production'))).toBe(true);
  });

  it('strictly rejects localhost PHONEPE_CALLBACK_URL in production', () => {
    const env = {
      ...baseValidProdEnv,
      PHONEPE_CALLBACK_URL: 'https://localhost:5001/api/v1/payments/webhook',
    };
    const result = validateProductionConfig(env);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((err) => err.includes('PHONEPE_CALLBACK_URL must not point to localhost in production'))).toBe(true);
  });

  it('strictly rejects non-https FRONTEND_URL in production', () => {
    const env = {
      ...baseValidProdEnv,
      FRONTEND_URL: 'http://purvaja.fashion',
    };
    const result = validateProductionConfig(env);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((err) => err.includes('FRONTEND_URL in production must use HTTPS scheme'))).toBe(true);
  });

  it('strictly rejects non-https CORS_ORIGIN in production', () => {
    const env = {
      ...baseValidProdEnv,
      CORS_ORIGIN: 'http://purvaja.fashion',
    };
    const result = validateProductionConfig(env);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((err) => err.includes('CORS_ORIGIN in production must use HTTPS scheme only'))).toBe(true);
  });

  it('strictly rejects staging DATABASE_URL when TLS sslmode is omitted', () => {
    const stagingEnv = {
      ...baseValidProdEnv,
      NODE_ENV: 'staging',
      PAYMENT_PROVIDER: 'demo',
      FRONTEND_URL: 'https://staging.purvaja.fashion',
      CORS_ORIGIN: 'https://staging.purvaja.fashion',
      DATABASE_URL: 'postgresql://staging_user:password@db.staging.internal:5432/purvaja_staging?schema=public',
    };
    const result = validateProductionConfig(stagingEnv);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((err) => err.includes('Staging DATABASE_URL must enforce TLS'))).toBe(true);
  });

  it('strictly rejects invalid database URL schemes', () => {
    const env = {
      ...baseValidProdEnv,
      DATABASE_URL: 'mysql://user:pass@host:3306/db',
    };
    const result = validateProductionConfig(env);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((err) => err.includes('must be a valid PostgreSQL connection string'))).toBe(true);
  });

  it('ensures no raw secrets appear in error outputs', () => {
    const rawSecret = 'SUPER_CONFIDENTIAL_DB_PASSWORD_XYZ';
    const env = {
      ...baseValidProdEnv,
      DATABASE_URL: `not-a-valid-url-with-secret-${rawSecret}`,
    };
    const result = validateProductionConfig(env);
    expect(result.isValid).toBe(false);
    const combinedErrors = result.errors.join(' ');
    expect(combinedErrors).not.toContain(rawSecret);
  });

  it('properly masks database credentials and connection strings', () => {
    const uri = 'postgresql://admin_user:super_secret_password_123@aws.db.provider.internal:5432/prod_db?sslmode=require';
    const masked = maskConnectionString(uri);
    expect(masked).not.toContain('super_secret_password_123');
    expect(masked).not.toContain('admin_user');
    expect(masked).toBe('postgresql://***:***@aws.db.provider.internal:5432/prod_db?sslmode=require');
  });

  it('properly masks generic secrets without disclosing raw content', () => {
    const secret = 'super-secret-key-12345678901234567890';
    const masked = maskSecret(secret);
    expect(masked).toBe('present (37 chars)');
    expect(masked).not.toContain('super-secret');
    expect(maskSecret('')).toBe('missing');
    expect(maskSecret(undefined)).toBe('missing');
  });
});
