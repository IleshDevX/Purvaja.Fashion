import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { env } from '../../src/config/env.js';
import { PhonePeProvider } from '../../src/services/payment-provider.service.js';

describe('PhonePe Standard Checkout OAuth contract', () => {
  const originalFetch = globalThis.fetch;
  const original = {
    environment: env.PHONEPE_ENVIRONMENT,
    clientId: env.PHONEPE_CLIENT_ID,
    clientSecret: env.PHONEPE_CLIENT_SECRET,
    clientVersion: env.PHONEPE_CLIENT_VERSION,
    webhookUsername: env.PHONEPE_WEBHOOK_USERNAME,
    webhookPassword: env.PHONEPE_WEBHOOK_PASSWORD,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    Object.assign(env, {
      PHONEPE_ENVIRONMENT: 'sandbox',
      PHONEPE_CLIENT_ID: 'sandbox-client-id',
      PHONEPE_CLIENT_SECRET: 'sandbox-client-secret',
      PHONEPE_CLIENT_VERSION: '1',
      PHONEPE_WEBHOOK_USERNAME: 'sandbox-webhook-user',
      PHONEPE_WEBHOOK_PASSWORD: 'sandbox-webhook-password',
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Object.assign(env, {
      PHONEPE_ENVIRONMENT: original.environment,
      PHONEPE_CLIENT_ID: original.clientId,
      PHONEPE_CLIENT_SECRET: original.clientSecret,
      PHONEPE_CLIENT_VERSION: original.clientVersion,
      PHONEPE_WEBHOOK_USERNAME: original.webhookUsername,
      PHONEPE_WEBHOOK_PASSWORD: original.webhookPassword,
    });
  });

  it('uses the official sandbox OAuth and checkout v2 contracts and caches the token', async () => {
    let tokenRequests = 0;
    let paymentRequests = 0;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token') {
        tokenRequests++;
        expect(init?.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' });
        expect(String(init?.body)).toContain('grant_type=client_credentials');
        return new Response(JSON.stringify({
          access_token: 'sandbox-oauth-token',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'O-Bearer',
        }), { status: 200 });
      }
      if (url === 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay') {
        paymentRequests++;
        expect(init?.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'O-Bearer sandbox-oauth-token' });
        expect(JSON.parse(String(init?.body))).toMatchObject({
          merchantOrderId: 'pay-test-1',
          amount: 49900,
          paymentFlow: { type: 'PG_CHECKOUT' },
        });
        return new Response(JSON.stringify({
          orderId: 'OMO-provider-order', state: 'PENDING', expireAt: Date.now() + 600_000,
          redirectUrl: 'https://mercury-uat.phonepe.com/transact/uat_v2?token=123',
        }), { status: 200 });
      }
      throw new Error(`Unexpected fetch to ${url}`);
    });

    const provider = new PhonePeProvider();
    const first = await provider.initiate({ paymentId: 'pay-test-1', amountPaise: 49900, orderNumber: 'ORD-TEST-1' });
    expect(first.providerReference).toBe('OMO-provider-order');
    await provider.initiate({ paymentId: 'pay-test-1', amountPaise: 49900, orderNumber: 'ORD-TEST-1' });
    expect(tokenRequests).toBe(1);
    expect(paymentRequests).toBe(2);
  });

  it('coalesces concurrent authorization and rejects tokens without provider expiry', async () => {
    const fetchToken = vi.fn().mockResolvedValue(new Response(JSON.stringify({ access_token: 'shared-token', expires_in: 3600 })));
    globalThis.fetch = fetchToken;
    const provider = new PhonePeProvider();
    expect(await Promise.all([provider.getAccessToken(), provider.getAccessToken(), provider.getAccessToken()]))
      .toEqual(['shared-token', 'shared-token', 'shared-token']);
    expect(fetchToken).toHaveBeenCalledTimes(1);
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ access_token: 'no-expiry-token' })));
    await expect(new PhonePeProvider().getAccessToken()).rejects.toMatchObject({ code: 'PHONEPE_OAUTH_FAILED' });
  });

  it('maps the official checkout v2 status response', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/v1/oauth/token')) {
        return new Response(JSON.stringify({ access_token: 'status-token', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'O-Bearer' }));
      }
      expect(url).toBe('https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/merchant-order-1/status?details=false&errorContext=true');
      expect(init?.headers).toMatchObject({ Authorization: 'O-Bearer status-token' });
      return new Response(JSON.stringify({
        orderId: 'OMO-1', state: 'COMPLETED', amount: 249900,
        paymentDetails: [{ transactionId: 'OM-transaction-1', amount: 249900, state: 'COMPLETED' }],
      }));
    });
    await expect(new PhonePeProvider().checkStatus('merchant-order-1')).resolves.toEqual({
      success: true, state: 'COMPLETED', amountPaise: 249900, providerReference: 'OM-transaction-1',
    });
  });

  it('uses the official payments v2 refund contract', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/v1/oauth/token')) {
        return new Response(JSON.stringify({ access_token: 'refund-token', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'O-Bearer' }));
      }
      expect(url).toBe('https://api-preprod.phonepe.com/apis/pg-sandbox/payments/v2/refund');
      expect(init?.headers).toMatchObject({ Authorization: 'O-Bearer refund-token' });
      expect(JSON.parse(String(init?.body))).toEqual({
        merchantRefundId: 'merchant-refund-1', originalMerchantOrderId: 'merchant-order-1', amount: 50000,
      });
      return new Response(JSON.stringify({ refundId: 'OMR-provider-refund', amount: 50000, state: 'PENDING' }));
    });
    await expect(new PhonePeProvider().refund({ refundId: 'merchant-refund-1', paymentId: 'merchant-order-1', amountPaise: 50000 }))
      .resolves.toEqual({ providerReference: 'OMR-provider-refund', state: 'PENDING', amountPaise: 50000 });
  });

  it('retrieves refund status by merchant refund identity', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/v1/oauth/token')) return new Response(JSON.stringify({ access_token: 'status-token', expires_in: 3600 }));
      expect(url).toBe('https://api-preprod.phonepe.com/apis/pg-sandbox/payments/v2/refund/merchant-refund/status');
      expect(init?.headers).toMatchObject({ Authorization: 'O-Bearer status-token' });
      return new Response(JSON.stringify({ refundId: 'provider-refund', amount: 50000, state: 'COMPLETED' }));
    });
    await expect(new PhonePeProvider().checkRefundStatus('merchant-refund')).resolves.toEqual({
      providerReference: 'provider-refund', amountPaise: 50000, state: 'COMPLETED',
    });
  });

  it('fails closed without credentials and validates configured SHA webhook authorization', async () => {
    const provider = new PhonePeProvider();
    const authorization = createHash('sha256').update('sandbox-webhook-user:sandbox-webhook-password').digest('hex');
    expect(provider.verifyWebhookAuthorization(authorization)).toBe(true);
    expect(provider.verifyWebhookAuthorization('wrong')).toBe(false);
    Object.assign(env, { PHONEPE_CLIENT_SECRET: undefined });
    await expect(provider.getAccessToken()).rejects.toMatchObject({ code: 'PHONEPE_CONFIG_MISSING', outcome: 'DEFINITE_FAILURE' });
  });

  it('classifies OAuth client rejection as a definite failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'invalid_client' }), { status: 401 }));
    await expect(new PhonePeProvider().getAccessToken()).rejects.toMatchObject({ code: 'PHONEPE_OAUTH_FAILED', outcome: 'DEFINITE_FAILURE' });
  });
});
