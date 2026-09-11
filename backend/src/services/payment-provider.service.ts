import { createHash, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { AppError, BadGatewayError, ForbiddenError, GatewayTimeoutError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface PaymentInitiation {
  paymentId: string;
  amountPaise: number;
  orderNumber: string;
}

export interface PhonePeStatusResult {
  success: boolean;
  state: 'COMPLETED' | 'FAILED' | 'PENDING';
  amountPaise?: number;
  providerReference?: string;
  responseCode?: string;
}

export interface PaymentProviderAdapter {
  readonly refundMode?: 'LIVE' | 'DEMO';
  initiate(input: PaymentInitiation): Promise<{ providerReference: string; redirectUrl: string }>;
  refund?(input: { refundId: string; paymentId: string; amountPaise: number }): Promise<RefundResult>;
  checkRefundStatus?(refundId: string): Promise<RefundResult>;
  verifyWebhookAuthorization?(authorization: string): boolean;
  checkStatus?(paymentId: string): Promise<PhonePeStatusResult>;
}

export interface RefundResult {
  providerReference: string;
  state: 'PENDING' | 'COMPLETED' | 'FAILED';
  amountPaise: number;
}

export class ProviderRefundError extends AppError {
  constructor(message: string, code: string, public readonly outcome: 'DEFINITE_FAILURE' | 'UNKNOWN', statusCode: 502 | 504 = 502) {
    super(message, statusCode, code);
  }
}

export class ProviderInitiationError extends AppError {
  constructor(message: string, code: string, public readonly outcome: 'DEFINITE_FAILURE' | 'UNKNOWN', statusCode: 502 | 504 = 502) {
    super(message, statusCode, code);
  }
}

export class DemoUpiProvider implements PaymentProviderAdapter {
  readonly refundMode = 'DEMO' as const;
  async initiate(input: PaymentInitiation) {
    if (env.NODE_ENV === 'production') throw new ForbiddenError('Demo payments are strictly prohibited in production.', 'DEMO_PAYMENTS_DISABLED');
    if (env.PAYMENT_PROVIDER !== 'demo') throw new ForbiddenError('Demo payment provider is not active.', 'DEMO_PAYMENTS_DISABLED');
    return {
      providerReference: `demo_${input.paymentId}`,
      redirectUrl: `${env.FRONTEND_URL}/checkout/payment?paymentId=${encodeURIComponent(input.paymentId)}`,
    };
  }

  async refund(input: { refundId: string; amountPaise: number }): Promise<RefundResult> {
    if (env.NODE_ENV === 'production' || env.PAYMENT_PROVIDER !== 'demo') {
      throw new ForbiddenError('Demo refunds are disabled.', 'DEMO_PAYMENTS_DISABLED');
    }
    return { providerReference: `demo_refund_${input.refundId}`, state: 'COMPLETED', amountPaise: input.amountPaise };
  }
}

interface PhonePeTokenResponse {
  access_token?: string;
  expires_at?: number;
  expires_in?: number | null;
  token_type?: string;
}

interface PhonePeOrderResponse {
  orderId?: string;
  state?: string;
  amount?: number;
  redirectUrl?: string;
  errorCode?: string;
  message?: string;
  paymentDetails?: Array<{ transactionId?: string; state?: string; amount?: number }>;
}

function required(value: string | undefined, name: string): string {
  if (!value?.trim()) {
    throw new ProviderInitiationError(`PhonePe configuration is missing ${name}.`, 'PHONEPE_CONFIG_MISSING', 'DEFINITE_FAILURE');
  }
  return value.trim();
}

export class PhonePeProvider implements PaymentProviderAdapter {
  readonly refundMode = 'LIVE' as const;
  private tokenCache?: { token: string; expiresAtMs: number };
  private tokenRequest?: Promise<string>;

  private get apiPrefix(): string {
    return env.PHONEPE_ENVIRONMENT === 'production'
      ? 'https://api.phonepe.com/apis/pg'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
  }

  private get identityPrefix(): string {
    return env.PHONEPE_ENVIRONMENT === 'production'
      ? 'https://api.phonepe.com/apis/identity-manager'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
  }

  private credentials() {
    return {
      clientId: required(env.PHONEPE_CLIENT_ID, 'PHONEPE_CLIENT_ID'),
      clientSecret: required(env.PHONEPE_CLIENT_SECRET, 'PHONEPE_CLIENT_SECRET'),
      clientVersion: required(env.PHONEPE_CLIENT_VERSION, 'PHONEPE_CLIENT_VERSION'),
    };
  }

  async getAccessToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAtMs > Date.now() + 60_000) return this.tokenCache.token;
    this.tokenRequest ??= this.fetchAccessToken().finally(() => { this.tokenRequest = undefined; });
    return this.tokenRequest;
  }

  private async fetchAccessToken(): Promise<string> {
    const credentials = this.credentials();
    try {
      const response = await fetch(`${this.identityPrefix}/v1/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: credentials.clientId,
          client_version: credentials.clientVersion,
          client_secret: credentials.clientSecret,
          grant_type: 'client_credentials',
        }).toString(),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        throw new ProviderInitiationError(
          `PhonePe OAuth authorization failed with HTTP ${response.status}`,
          'PHONEPE_OAUTH_FAILED',
          response.status >= 400 && response.status < 500 ? 'DEFINITE_FAILURE' : 'UNKNOWN',
        );
      }
      const body = await response.json() as PhonePeTokenResponse;
      if (!body.access_token || (body.token_type && body.token_type !== 'O-Bearer')) {
        throw new ProviderInitiationError('PhonePe OAuth response was missing a valid O-Bearer token.', 'PHONEPE_OAUTH_FAILED', 'DEFINITE_FAILURE');
      }
      const expiresAtMs = typeof body.expires_at === 'number'
        ? body.expires_at * 1000
        : Date.now() + (typeof body.expires_in === 'number' ? body.expires_in : 0) * 1000;
      if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
        throw new ProviderInitiationError('PhonePe token expiry is invalid.', 'PHONEPE_OAUTH_FAILED', 'DEFINITE_FAILURE');
      }
      this.tokenCache = { token: body.access_token, expiresAtMs };
      return body.access_token;
    } catch (error) {
      if (error instanceof ProviderInitiationError) throw error;
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new ProviderInitiationError('PhonePe OAuth request timed out.', 'PHONEPE_TIMEOUT', 'UNKNOWN', 504);
      }
      throw new ProviderInitiationError(
        `Unable to reach PhonePe authorization service: ${error instanceof Error ? error.message : 'Network error'}`,
        'PHONEPE_NETWORK_ERROR',
        'UNKNOWN',
      );
    }
  }

  private async authorizationHeaders(): Promise<Record<string, string>> {
    return { 'Content-Type': 'application/json', Authorization: `O-Bearer ${await this.getAccessToken()}` };
  }

  async initiate(input: PaymentInitiation): Promise<{ providerReference: string; redirectUrl: string }> {
    const redirectUrl = `${env.FRONTEND_URL}/account/orders?orderNumber=${encodeURIComponent(input.orderNumber)}`;
    try {
      const response = await fetch(`${this.apiPrefix}/checkout/v2/pay`, {
        method: 'POST',
        headers: await this.authorizationHeaders(),
        body: JSON.stringify({
          merchantOrderId: input.paymentId,
          amount: input.amountPaise,
          paymentFlow: { type: 'PG_CHECKOUT', merchantUrls: { redirectUrl } },
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const body = await response.json() as PhonePeOrderResponse;
      if (response.ok && body.orderId && body.redirectUrl && body.state === 'PENDING') {
        return { providerReference: body.orderId, redirectUrl: body.redirectUrl };
      }
      logger.error({ paymentId: input.paymentId, status: response.status, responseCode: body.errorCode }, 'PhonePe payment initiation rejected.');
      throw new ProviderInitiationError(
        body.message || 'PhonePe rejected the payment request.',
        'PHONEPE_INITIATION_FAILED',
        response.status >= 400 && response.status < 500 ? 'DEFINITE_FAILURE' : 'UNKNOWN',
      );
    } catch (error) {
      if (error instanceof ProviderInitiationError) throw error;
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new ProviderInitiationError('PhonePe payment request timed out.', 'PHONEPE_TIMEOUT', 'UNKNOWN', 504);
      }
      throw new ProviderInitiationError(`Unable to reach PhonePe gateway: ${error instanceof Error ? error.message : 'Network error'}`, 'PHONEPE_NETWORK_ERROR', 'UNKNOWN');
    }
  }

  async refund(input: { refundId: string; paymentId: string; amountPaise: number }): Promise<RefundResult> {
    try {
      const response = await fetch(`${this.apiPrefix}/payments/v2/refund`, {
        method: 'POST',
        headers: await this.authorizationHeaders(),
        body: JSON.stringify({ merchantRefundId: input.refundId, originalMerchantOrderId: input.paymentId, amount: input.amountPaise }),
        signal: AbortSignal.timeout(10_000),
      });
      const body = await response.json() as { refundId?: string; amount?: number; state?: string; message?: string; errorCode?: string };
      if (response.ok && body.refundId && body.amount === input.amountPaise && ['PENDING', 'COMPLETED'].includes(body.state ?? '')) {
        return { providerReference: body.refundId, state: body.state as 'PENDING' | 'COMPLETED', amountPaise: body.amount };
      }
      logger.error({ refundId: input.refundId, status: response.status, responseCode: body.errorCode }, 'PhonePe refund rejected.');
      throw new ProviderRefundError(
        body.message || 'PhonePe rejected the refund request.',
        'PHONEPE_REFUND_FAILED',
        response.status >= 400 && response.status < 500 ? 'DEFINITE_FAILURE' : 'UNKNOWN',
      );
    } catch (error) {
      if (error instanceof ProviderRefundError || error instanceof ProviderInitiationError) throw error;
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new ProviderRefundError('PhonePe refund request timed out.', 'PHONEPE_TIMEOUT', 'UNKNOWN', 504);
      }
      throw new ProviderRefundError(`Unable to reach PhonePe refund service: ${error instanceof Error ? error.message : 'Network error'}`, 'PHONEPE_NETWORK_ERROR', 'UNKNOWN');
    }
  }

  async checkRefundStatus(refundId: string): Promise<RefundResult> {
    const response = await fetch(`${this.apiPrefix}/payments/v2/refund/${encodeURIComponent(refundId)}/status`, {
      headers: await this.authorizationHeaders(), signal: AbortSignal.timeout(10_000),
    });
    const body = await response.json() as { refundId?: string; amount?: number; state?: string };
    if (!response.ok || !body.refundId || !Number.isSafeInteger(body.amount) || (body.amount ?? 0) <= 0 ||
        !['PENDING', 'COMPLETED', 'FAILED'].includes(body.state ?? '')) {
      throw new ProviderRefundError('PhonePe refund status could not be verified.', 'PHONEPE_REFUND_STATUS_INVALID', 'UNKNOWN');
    }
    return { providerReference: body.refundId, amountPaise: body.amount!, state: body.state as RefundResult['state'] };
  }

  verifyWebhookAuthorization(authorization: string): boolean {
    const username = env.PHONEPE_WEBHOOK_USERNAME;
    const password = env.PHONEPE_WEBHOOK_PASSWORD;
    if (!authorization || !username || !password) return false;
    const expected = createHash('sha256').update(`${username}:${password}`).digest('hex');
    const received = authorization.trim().replace(/^SHA256\s+/i, '');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const receivedBuffer = Buffer.from(received, 'utf8');
    return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  async checkStatus(merchantOrderId: string): Promise<PhonePeStatusResult> {
    try {
      const response = await fetch(
        `${this.apiPrefix}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status?details=false&errorContext=true`,
        { method: 'GET', headers: await this.authorizationHeaders(), signal: AbortSignal.timeout(10_000) },
      );
      if (!response.ok) throw new BadGatewayError(`PhonePe status API returned HTTP ${response.status}`, 'PHONEPE_INVALID_RESPONSE');
      const body = await response.json() as PhonePeOrderResponse;
      const latest = body.paymentDetails?.find(detail => detail.state === 'COMPLETED') ?? body.paymentDetails?.[0];
      if (body.state === 'COMPLETED') {
        if (!Number.isInteger(body.amount) || (body.amount ?? 0) <= 0) {
          throw new BadGatewayError('PhonePe completed status omitted a valid integer amount.', 'PHONEPE_INVALID_AMOUNT');
        }
        return { success: true, state: 'COMPLETED', amountPaise: body.amount, providerReference: latest?.transactionId ?? body.orderId };
      }
      if (body.state === 'FAILED') {
        return { success: false, state: 'FAILED', amountPaise: body.amount, providerReference: latest?.transactionId ?? body.orderId, responseCode: body.errorCode };
      }
      return { success: false, state: 'PENDING', amountPaise: body.amount, providerReference: latest?.transactionId ?? body.orderId, responseCode: body.errorCode };
    } catch (error) {
      if (error instanceof BadGatewayError) throw error;
      if (error instanceof ProviderInitiationError) throw new BadGatewayError(`Failed to authorize PhonePe status request: ${error.message}`, error.code);
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new GatewayTimeoutError('PhonePe status check timed out.', 'PHONEPE_TIMEOUT');
      }
      throw new BadGatewayError(`Failed to verify PhonePe status: ${error instanceof Error ? error.message : 'Network error'}`, 'PHONEPE_NETWORK_ERROR');
    }
  }
}

const phonePeProvider = new PhonePeProvider();
const demoProvider = new DemoUpiProvider();
export function paymentProvider(): PaymentProviderAdapter {
  if (env.NODE_ENV === 'production' && env.PAYMENT_PROVIDER === 'demo') {
    throw new ForbiddenError('Demo payments are strictly prohibited in production.', 'DEMO_PAYMENTS_DISABLED');
  }
  return env.PAYMENT_PROVIDER === 'phonepe' ? phonePeProvider : demoProvider;
}
