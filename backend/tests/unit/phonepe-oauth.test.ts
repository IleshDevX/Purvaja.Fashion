import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PhonePeProvider } from '../../src/services/payment-provider.service.js';

describe('PhonePe Standard Checkout OAuth Integration', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('acquires and caches OAuth access token using client_credentials grant', async () => {
    let tokenRequests = 0;
    let paymentRequests = 0;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/v1/oauth/token')) {
        tokenRequests++;
        expect(init?.method).toBe('POST');
        expect(init?.headers).toMatchObject({ 'Content-Type': 'application/x-www-form-urlencoded' });
        const body = init?.body as string;
        expect(body).toContain('grant_type=client_credentials');
        expect(body).toContain('client_id=');
        expect(body).toContain('client_secret=');
        return new Response(JSON.stringify({
          access_token: 'mock-oauth-jwt-token-12345',
          expires_in: 3600,
          token_type: 'Bearer',
        }), { status: 200 });
      }

      if (url.includes('/pg/v1/pay')) {
        paymentRequests++;
        expect(init?.headers).toMatchObject({
          'Authorization': 'Bearer mock-oauth-jwt-token-12345',
          'Content-Type': 'application/json',
        });
        return new Response(JSON.stringify({
          success: true,
          code: 'PAYMENT_INITIATED',
          data: {
            merchantTransactionId: 'pay-tx-123',
            instrumentResponse: {
              redirectInfo: {
                url: 'https://mercury-uat.phonepe.com/transact?token=123',
              },
            },
          },
        }), { status: 200 });
      }

      throw new Error(`Unexpected fetch to ${url}`);
    });

    const provider = new PhonePeProvider();

    // First call: requests token then initiates payment
    const res1 = await provider.initiate({
      paymentId: 'pay-test-1',
      amountPaise: 49900,
      orderNumber: 'ORD-TEST-1',
    });
    expect(res1.providerReference).toBe('pay-tx-123');
    expect(res1.redirectUrl).toContain('mercury-uat.phonepe.com');
    expect(tokenRequests).toBe(1);
    expect(paymentRequests).toBe(1);

    // Second call: reuses cached token, does not call /v1/oauth/token again
    const res2 = await provider.initiate({
      paymentId: 'pay-test-2',
      amountPaise: 79900,
      orderNumber: 'ORD-TEST-2',
    });
    expect(res2.providerReference).toBe('pay-tx-123');
    expect(tokenRequests).toBe(1); // Cached!
    expect(paymentRequests).toBe(2);
  });

  it('checkStatus attaches Authorization Bearer token to status queries', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/v1/oauth/token')) {
        return new Response(JSON.stringify({
          access_token: 'mock-status-token',
          expires_in: 3600,
        }), { status: 200 });
      }

      if (url.includes('/pg/v1/status/')) {
        expect(init?.headers).toMatchObject({
          'Authorization': 'Bearer mock-status-token',
        });
        return new Response(JSON.stringify({
          success: true,
          code: 'PAYMENT_SUCCESS',
          data: {
            merchantId: 'MOCK_MERCHANT',
            merchantTransactionId: 'tx-status-check',
            transactionId: 'provider-ref-123',
            amount: 249900,
            state: 'COMPLETED',
          },
        }), { status: 200 });
      }

      throw new Error(`Unexpected fetch to ${url}`);
    });

    const provider = new PhonePeProvider();
    const status = await provider.checkStatus('tx-status-check');
    expect(status.success).toBe(true);
    expect(status.state).toBe('COMPLETED');
    expect(status.amountPaise).toBe(249900);
  });

  it('classifies 4xx OAuth failure as DEFINITE_FAILURE ProviderInitiationError', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'invalid_client',
      error_description: 'Client credentials invalid',
    }), { status: 401 }));

    const provider = new PhonePeProvider();
    await expect(
      provider.initiate({
        paymentId: 'pay-fail',
        amountPaise: 1000,
        orderNumber: 'ORD-FAIL',
      }),
    ).rejects.toMatchObject({
      code: 'PHONEPE_OAUTH_FAILED',
      outcome: 'DEFINITE_FAILURE',
    });
  });

  it('executes automated refund and returns provider reference on completion', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/v1/oauth/token')) {
        return new Response(JSON.stringify({
          access_token: 'mock-oauth-jwt-token-refund',
          expires_in: 3600,
          token_type: 'Bearer',
        }), { status: 200 });
      }

      if (url.includes('/pg/v1/refund')) {
        expect(init?.method).toBe('POST');
        expect(init?.headers).toMatchObject({
          'Authorization': 'Bearer mock-oauth-jwt-token-refund',
          'Content-Type': 'application/json',
        });
        const body = JSON.parse(init?.body as string);
        const decodedPayload = JSON.parse(Buffer.from(body.request, 'base64').toString('utf-8'));
        expect(decodedPayload.originalTransactionId).toBe('pay-orig-123');
        expect(decodedPayload.amount).toBe(50000);
        return new Response(JSON.stringify({
          success: true,
          code: 'PAYMENT_SUCCESS',
          data: {
            merchantTransactionId: 'ref-req-456',
            transactionId: 'phonepe-ref-tx-789',
            amount: 50000,
            state: 'COMPLETED',
          },
        }), { status: 200 });
      }

      throw new Error(`Unexpected fetch to ${url}`);
    });

    const provider = new PhonePeProvider();
    const result = await provider.refund({
      refundId: 'ref-req-456',
      paymentId: 'pay-orig-123',
      amountPaise: 50000,
    });

    expect(result.providerReference).toBe('phonepe-ref-tx-789');
  });
});

