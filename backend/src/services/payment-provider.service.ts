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
  initiate(input: PaymentInitiation): Promise<{ providerReference: string; redirectUrl: string }>;
  refund?(input: { refundId: string; paymentId: string; amountPaise: number }): Promise<{ providerReference: string }>;
  verifyCallbackSignature?(payload: string, xVerify: string): boolean;
  checkStatus?(paymentId: string): Promise<PhonePeStatusResult>;
}

export class ProviderRefundError extends AppError {
  constructor(
    message: string,
    code: string,
    public readonly outcome: 'DEFINITE_FAILURE' | 'UNKNOWN',
    statusCode: 502 | 504 = 502,
  ) {
    super(message, statusCode, code);
  }
}

export class ProviderInitiationError extends AppError {
  constructor(
    message: string,
    code: string,
    public readonly outcome: 'DEFINITE_FAILURE' | 'UNKNOWN',
    statusCode: 502 | 504 = 502,
  ) {
    super(message, statusCode, code);
  }
}

export class DemoUpiProvider implements PaymentProviderAdapter {
  async initiate(input: PaymentInitiation) {
    if (env.NODE_ENV === 'production') {
      throw new ForbiddenError('Demo payments are strictly prohibited in production.', 'DEMO_PAYMENTS_DISABLED');
    }
    if (env.PAYMENT_PROVIDER !== 'demo') {
      throw new ForbiddenError('Demo payment provider is not active.', 'DEMO_PAYMENTS_DISABLED');
    }

    return {
      providerReference: `demo_${input.paymentId}`,
      redirectUrl: `${env.FRONTEND_URL}/checkout/payment?paymentId=${encodeURIComponent(input.paymentId)}`,
    };
  }

  async refund(input: { refundId: string }) {
    if (env.NODE_ENV === 'production' || env.PAYMENT_PROVIDER !== 'demo') {
      throw new ForbiddenError('Demo refunds are disabled.', 'DEMO_PAYMENTS_DISABLED');
    }
    return { providerReference: `demo_refund_${input.refundId}` };
  }
}

export class PhonePeProvider implements PaymentProviderAdapter {
  private get baseUrl(): string {
    return env.PHONEPE_ENVIRONMENT === 'production'
      ? 'https://api.phonepe.com/apis/hermes'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
  }

  private get merchantId(): string {
    return env.PHONEPE_MERCHANT_ID || 'MOCK_MERCHANT';
  }

  private get clientId(): string {
    return env.PHONEPE_CLIENT_ID || 'MOCK_CLIENT_ID';
  }

  private get clientSecret(): string {
    return env.PHONEPE_CLIENT_SECRET || 'mock_salt_key_default';
  }

  private get clientVersion(): string {
    return env.PHONEPE_CLIENT_VERSION || '1';
  }

  private get saltKey(): string {
    return this.clientSecret;
  }

  private get saltIndex(): string {
    return this.clientVersion;
  }

  private tokenCache?: { token: string; expiresAt: number };

  async getAccessToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 60_000) {
      return this.tokenCache.token;
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_version: this.clientVersion,
          client_secret: this.clientSecret,
        }).toString(),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const outcome = response.status >= 400 && response.status < 500 ? 'DEFINITE_FAILURE' : 'UNKNOWN';
        throw new ProviderInitiationError(
          `PhonePe OAuth authorization failed with HTTP ${response.status}`,
          'PHONEPE_OAUTH_FAILED',
          outcome,
          502,
        );
      }

      const body = await response.json() as { access_token?: string; expires_in?: number };
      if (!body.access_token) {
        throw new ProviderInitiationError(
          'PhonePe OAuth response missing access_token',
          'PHONEPE_OAUTH_FAILED',
          'DEFINITE_FAILURE',
          502,
        );
      }

      const expiresIn = typeof body.expires_in === 'number' ? body.expires_in : 3600;
      this.tokenCache = {
        token: body.access_token,
        expiresAt: Date.now() + expiresIn * 1000,
      };
      return body.access_token;
    } catch (error) {
      if (error instanceof ProviderInitiationError) throw error;
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new ProviderInitiationError('PhonePe OAuth request timed out.', 'PHONEPE_TIMEOUT', 'UNKNOWN', 504);
      }
      throw error;
    }
  }

  async initiate(input: PaymentInitiation): Promise<{ providerReference: string; redirectUrl: string }> {
    const callbackUrl = env.PHONEPE_CALLBACK_URL || `${env.FRONTEND_URL}/api/v1/payments/phonepe-callback`;
    const redirectUrl = `${env.FRONTEND_URL}/account/orders?orderNumber=${encodeURIComponent(input.orderNumber)}`;

    const payload = {
      merchantId: this.merchantId,
      merchantTransactionId: input.paymentId,
      merchantUserId: `USR_${input.orderNumber.replace(/[^a-zA-Z0-9]/g, '')}`,
      amount: input.amountPaise,
      redirectUrl,
      redirectMode: 'REDIRECT',
      callbackUrl,
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signaturePath = '/pg/v1/pay';
    const stringToSign = base64Payload + signaturePath + this.saltKey;
    const sha256 = createHash('sha256').update(stringToSign).digest('hex');
    const xVerify = `${sha256}###${this.saltIndex}`;

    try {
      let accessToken: string | undefined;
      try {
        accessToken = await this.getAccessToken();
      } catch (oauthErr) {
        if (oauthErr instanceof ProviderInitiationError) throw oauthErr;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerify,
        'X-MERCHANT-ID': this.merchantId,
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${this.baseUrl}${signaturePath}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ request: base64Payload }),
        signal: AbortSignal.timeout(10000),
      });

      const responseBody = await response.json() as {
        success?: boolean;
        code?: string;
        message?: string;
        data?: {
          merchantTransactionId?: string;
          instrumentResponse?: {
            redirectInfo?: {
              url?: string;
            };
          };
        };
      };

      if (response.ok && responseBody.success && responseBody.data?.instrumentResponse?.redirectInfo?.url) {
        return {
          providerReference: responseBody.data.merchantTransactionId || `pp_${input.paymentId}`,
          redirectUrl: responseBody.data.instrumentResponse.redirectInfo.url,
        };
      }

      logger.error(
        { paymentId: input.paymentId, status: response.status, responseBody },
        'PhonePe payment initiation rejected by gateway.',
      );
      const outcome = response.status >= 400 && response.status < 500
        ? 'DEFINITE_FAILURE'
        : 'UNKNOWN';
      throw new ProviderInitiationError(
        responseBody.message || 'PhonePe payment gateway rejected initiation request.',
        'PHONEPE_INITIATION_FAILED',
        outcome,
      );
    } catch (error) {
      if (error instanceof ProviderInitiationError) throw error;
      if (error instanceof Error && error.name === 'TimeoutError') {
        logger.error({ paymentId: input.paymentId }, 'PhonePe payment initiation timed out.');
        throw new ProviderInitiationError(
          'PhonePe payment gateway timed out.',
          'PHONEPE_TIMEOUT',
          'UNKNOWN',
          504,
        );
      }

      logger.error(
        { paymentId: input.paymentId, error: error instanceof Error ? error.message : 'UnknownError' },
        'PhonePe network error during payment initiation.',
      );
      throw new ProviderInitiationError(
        `Unable to reach PhonePe gateway: ${error instanceof Error ? error.message : 'Network error'}`,
        'PHONEPE_NETWORK_ERROR',
        'UNKNOWN',
      );
    }
  }

  async refund(input: { refundId: string; paymentId: string; amountPaise: number }): Promise<{ providerReference: string }> {
    const callbackUrl = env.PHONEPE_CALLBACK_URL || `${env.FRONTEND_URL}/api/v1/payments/phonepe-callback`;
    const payload = {
      merchantId: this.merchantId,
      merchantUserId: `REF_${input.refundId.replace(/[^a-zA-Z0-9]/g, '')}`,
      originalTransactionId: input.paymentId,
      merchantTransactionId: input.refundId,
      amount: input.amountPaise,
      callbackUrl,
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signaturePath = '/pg/v1/refund';
    const stringToSign = base64Payload + signaturePath + this.saltKey;
    const sha256 = createHash('sha256').update(stringToSign).digest('hex');
    const xVerify = `${sha256}###${this.saltIndex}`;

    try {
      let accessToken: string | undefined;
      try {
        accessToken = await this.getAccessToken();
      } catch (oauthErr) {
        if (oauthErr instanceof ProviderInitiationError) throw oauthErr;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerify,
        'X-MERCHANT-ID': this.merchantId,
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${this.baseUrl}${signaturePath}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ request: base64Payload }),
        signal: AbortSignal.timeout(10000),
      });

      const responseBody = await response.json() as {
        success?: boolean;
        code?: string;
        message?: string;
        data?: {
          merchantId?: string;
          merchantTransactionId?: string;
          transactionId?: string;
          amount?: number;
          state?: string;
          responseCode?: string;
        };
      };

      if (response.ok && responseBody.success && responseBody.data) {
        return {
          providerReference: responseBody.data.transactionId || responseBody.data.merchantTransactionId || `pp_ref_${input.refundId}`,
        };
      }

      logger.error(
        { refundId: input.refundId, status: response.status, responseBody },
        'PhonePe refund rejected by gateway.',
      );
      const outcome = response.status >= 400 && response.status < 500
        ? 'DEFINITE_FAILURE'
        : 'UNKNOWN';
      throw new ProviderRefundError(
        responseBody.message || 'PhonePe payment gateway rejected refund request.',
        'PHONEPE_REFUND_FAILED',
        outcome,
      );
    } catch (error) {
      if (error instanceof ProviderRefundError) throw error;
      if (error instanceof Error && error.name === 'TimeoutError') {
        logger.error({ refundId: input.refundId }, 'PhonePe refund request timed out.');
        throw new ProviderRefundError(
          'PhonePe refund request timed out.',
          'PHONEPE_TIMEOUT',
          'UNKNOWN',
          504,
        );
      }
      throw error;
    }
  }

  verifyCallbackSignature(payloadString: string, receivedXVerify: string): boolean {
    if (!receivedXVerify || !receivedXVerify.includes('###')) {
      return false;
    }

    const parts = receivedXVerify.split('###');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return false;
    }

    const [receivedHash, receivedIndex] = parts;
    if (receivedIndex !== this.saltIndex) {
      return false;
    }

    const expectedHash = createHash('sha256')
      .update(payloadString + this.saltKey)
      .digest('hex');

    const receivedBuf = Buffer.from(receivedHash);
    const expectedBuf = Buffer.from(expectedHash);

    if (receivedBuf.length !== expectedBuf.length) {
      return false;
    }

    return timingSafeEqual(receivedBuf, expectedBuf);
  }

  async checkStatus(merchantTransactionId: string): Promise<PhonePeStatusResult> {
    const endpoint = `/pg/v1/status/${this.merchantId}/${merchantTransactionId}`;
    const stringToSign = endpoint + this.saltKey;
    const sha256 = createHash('sha256').update(stringToSign).digest('hex');
    const xVerify = `${sha256}###${this.saltIndex}`;

    try {
      let accessToken: string | undefined;
      try {
        accessToken = await this.getAccessToken();
      } catch {
        // Fallback for mocked test environments
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerify,
        'X-MERCHANT-ID': this.merchantId,
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new BadGatewayError(`PhonePe status API returned HTTP ${response.status}`, 'PHONEPE_INVALID_RESPONSE');
      }

      const responseBody = await response.json() as {
        success?: boolean;
        code?: string;
        message?: string;
        data?: {
          merchantId?: string;
          merchantTransactionId?: string;
          transactionId?: string;
          amount?: number;
          state?: string;
          responseCode?: string;
        };
      };

      if (responseBody.data?.merchantId && responseBody.data.merchantId !== this.merchantId) {
        throw new BadGatewayError('Returned merchantId does not match configured merchant.', 'PHONEPE_IDENTITY_MISMATCH');
      }
      if (responseBody.data?.merchantTransactionId && responseBody.data.merchantTransactionId !== merchantTransactionId) {
        throw new BadGatewayError('Returned merchantTransactionId does not match requested transaction.', 'PHONEPE_IDENTITY_MISMATCH');
      }

      const state = responseBody.data?.state;
      if (state === 'COMPLETED' && responseBody.success) {
        const amount = responseBody.data?.amount;
        if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
          throw new BadGatewayError('PhonePe completed status response missing valid integer amount.', 'PHONEPE_INVALID_AMOUNT');
        }
        return {
          success: true,
          state: 'COMPLETED',
          amountPaise: amount,
          providerReference: responseBody.data?.transactionId || responseBody.data?.merchantTransactionId,
          responseCode: responseBody.code,
        };
      }

      if (state === 'FAILED' || responseBody.code === 'PAYMENT_ERROR') {
        return {
          success: false,
          state: 'FAILED',
          amountPaise: responseBody.data?.amount,
          providerReference: responseBody.data?.transactionId,
          responseCode: responseBody.code,
        };
      }

      return {
        success: false,
        state: 'PENDING',
        amountPaise: responseBody.data?.amount,
        providerReference: responseBody.data?.transactionId,
        responseCode: responseBody.code,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new GatewayTimeoutError('PhonePe status check timed out.', 'PHONEPE_TIMEOUT');
      }
      throw new BadGatewayError(
        `Failed to verify PhonePe status: ${error instanceof Error ? error.message : 'Network error'}`,
        'PHONEPE_NETWORK_ERROR',
      );
    }
  }
}

export function paymentProvider(): PaymentProviderAdapter {
  if (env.NODE_ENV === 'production' && env.PAYMENT_PROVIDER === 'demo') {
    throw new ForbiddenError('Demo payment provider cannot be used in production.', 'DEMO_PAYMENTS_DISABLED');
  }
  return env.PAYMENT_PROVIDER === 'demo' ? new DemoUpiProvider() : new PhonePeProvider();
}
