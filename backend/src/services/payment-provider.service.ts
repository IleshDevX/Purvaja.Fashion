import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

export interface PaymentInitiation { paymentId: string; amountPaise: number; orderNumber: string; }
export interface PaymentProviderAdapter { initiate(input: PaymentInitiation): Promise<{ providerReference: string; redirectUrl: string }> }

class DemoUpiProvider implements PaymentProviderAdapter {
  async initiate(input: PaymentInitiation) {
    return { providerReference: `demo_${input.paymentId}`, redirectUrl: `${env.FRONTEND_URL}/checkout/payment?paymentId=${encodeURIComponent(input.paymentId)}` };
  }
}

class PhonePeProvider implements PaymentProviderAdapter {
  async initiate(_input: PaymentInitiation): Promise<{ providerReference: string; redirectUrl: string }> {
    // Kept intentionally isolated: the merchant-specific PhonePe contract must be verified before live activation.
    throw new AppError('PhonePe live initiation is not enabled in this build.', 503, 'PHONEPE_NOT_ENABLED');
  }
}

export function paymentProvider(): PaymentProviderAdapter {
  return env.PAYMENT_PROVIDER === 'demo' ? new DemoUpiProvider() : new PhonePeProvider();
}
