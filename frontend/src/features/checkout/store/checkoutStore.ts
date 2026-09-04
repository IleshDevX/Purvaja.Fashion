import { create } from 'zustand';
import { CartItem } from '../../../store/cartStore.js';
import {
  ShippingAddress,
  DeliveryOptionId,
  PaymentMethodId,
  CouponDiscount,
  CheckoutStep,
} from '../types/checkout.js';
import type { CheckoutSession } from '../../../services/api/contracts.js';
import { orderService } from '../../orders/services/orderService.js';

interface CheckoutState {
  shippingAddress: ShippingAddress | null;
  deliveryOptionId: DeliveryOptionId;
  paymentMethodId: PaymentMethodId;
  coupon: CouponDiscount | null;
  currentStep: CheckoutStep;
  isProcessing: boolean;
  paymentStatus: 'idle' | 'processing' | 'success' | 'failure' | 'cancelled';
  lastCheckout: CheckoutSession | null;

  setShippingAddress: (address: ShippingAddress) => void;
  setDeliveryOptionId: (id: DeliveryOptionId) => void;
  setPaymentMethodId: (id: PaymentMethodId) => void;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  setCurrentStep: (step: CheckoutStep) => void;
  processPayment: (
    items: CartItem[],
  ) => Promise<{ success: boolean; orderId?: string; error?: string }>;
  resetCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutState>((set, get) => ({
  shippingAddress: null,
  deliveryOptionId: 'standard',
  paymentMethodId: 'phonepe',
  coupon: null,
  currentStep: 'address',
  isProcessing: false,
  paymentStatus: 'idle',
  lastCheckout: null,

  setShippingAddress: (address: ShippingAddress) => set({ shippingAddress: address }),

  setDeliveryOptionId: (id: DeliveryOptionId) => set({ deliveryOptionId: id }),

  setPaymentMethodId: (id: PaymentMethodId) => set({ paymentMethodId: id }),

  applyCoupon: (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return { success: false, message: 'Enter a promotional code.' };
    set({ coupon: { code, description: 'Eligibility is confirmed securely at payment.' } });
    return { success: true, message: 'Promotional code saved for secure validation at payment.' };
  },

  removeCoupon: () => set({ coupon: null }),

  setCurrentStep: (step: CheckoutStep) => set({ currentStep: step }),

  processPayment: async (items: CartItem[]) => {
    if (get().isProcessing) {
      return { success: false, error: 'Payment is already being processed.' };
    }

    const { shippingAddress, deliveryOptionId, paymentMethodId, coupon } = get();

    if (!shippingAddress) {
      return { success: false, error: 'Shipping address is missing.' };
    }
    if (items.length === 0) {
      return { success: false, error: 'Shopping bag is empty.' };
    }

    set({ isProcessing: true, paymentStatus: 'processing' });

    try {
      const checkout = await orderService.checkout({
        lines: items.map(item => ({
          productId: item.shirtId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        shippingAddress,
        deliveryOptionId,
        paymentMethodId,
        couponCode: coupon?.code,
      });
      if (!checkout.orderId) {
        throw new Error('Checkout response was invalid.');
      }

      set({
        isProcessing: false,
        paymentStatus: 'success',
        lastCheckout: checkout,
      });
      return { success: true, orderId: checkout.orderId };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Payment could not be processed.';
      set({ isProcessing: false, paymentStatus: 'failure' });
      return { success: false, error: message };
    }
  },

  resetCheckout: () => {
    set({
      shippingAddress: null,
      deliveryOptionId: 'standard',
      paymentMethodId: 'phonepe',
      coupon: null,
      currentStep: 'address',
      isProcessing: false,
      paymentStatus: 'idle',
      lastCheckout: null,
    });
  },
}));
