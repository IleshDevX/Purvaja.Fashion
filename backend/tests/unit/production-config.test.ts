import { describe, it, expect } from 'vitest';
import {
  validateProductionConfig,
  maskConnectionString,
  maskSecret,
} from '../../src/scripts/validate-config.js';

describe('Production Configuration Validator', () => {
  const baseValidProdEnv: Record<string, string> = {
    NODE_ENV: 'production',
    PORT: '5001',
    HOST: '0.0.0.0',
    TRUST_PROXY: '1',
    DATABASE_URL: 'postgresql://prod_user:SuperSecretPassword123!@db.hostinger.com:5432/purvaja_prod?schema=public&sslmode=require',
    DIRECT_URL: 'postgresql://prod_user:SuperSecretPassword123!@db.hostinger.com:5432/purvaja_prod?schema=public&sslmode=require',
    SESSION_SECRET: 'a-cryptographically-secure-32-character-secret-key-prod',
    CORS_ORIGIN: 'https://purvaja.fashion,https://www.purvaja.fashion',
    FRONTEND_URL: 'https://purvaja.fashion',
    PAYMENT_PROVIDER: 'phonepe',
    PHONEPE_MERCHANT_ID: 'MERCHANT123',
    PHONEPE_CLIENT_ID: 'CLIENT123',
    PHONEPE_CLIENT_SECRET: 'SECRET123',
    PHONEPE_CLIENT_VERSION: '1',
    PHONEPE_CALLBACK_URL: 'https://purvaja.fashion/api/v1/payments/webhook',
    EMAIL_FROM: 'noreply@purvaja.fashion',
    RESEND_API_KEY: 're_valid_live_key',
  };

  it('validates a complete and secure production configuration successfully', () => {
    const result = validateProductionConfig(baseValidProdEnv);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.summary.NODE_ENV).toBe('production');
  });

  it('fails production validation when SESSION_SECRET is missing', () => {
    const env = { ...baseValidProdEnv, SESSION_SECRET: '' };
    const result = validateProductionConfig(env);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((err) => err.includes('SESSION_SECRET'))).toBe(true);
  });

  it('fails production validation when SESSION_SECRET is shorter than 32 characters', () => {
    const env = { ...baseValidProdEnv, SESSION_SECRET: 'short-secret-key' };
    const result = validateProductionConfig(env);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((err) => err.includes('SESSION_SECRET must be at least 32 characters'))).toBe(true);
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
