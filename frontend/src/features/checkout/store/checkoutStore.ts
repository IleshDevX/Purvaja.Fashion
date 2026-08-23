import { create } from 'zustand';
import { CartItem } from '../../../store/cartStore.js';
import {
  ShippingAddress,
  DeliveryOptionId,
  PaymentMethodId,
  PaymentMethod,
  CouponDiscount,
  CheckoutStep,
  ConfirmedOrder,
} from '../types/checkout.js';
import {
  calculateOrderPricing,
  AVAILABLE_DELIVERY_OPTIONS,
  AVAILABLE_PAYMENT_METHODS,
  DEVELOPMENT_COUPONS,
} from '../utils/pricing.js';
import { developmentOrderStore } from '../../orders/store/developmentOrderStore.js';
import { apiClient } from '../../../services/api/client.js';
import { config } from '../../../app/config.js';

interface CheckoutState {
  shippingAddress: ShippingAddress | null;
  deliveryOptionId: DeliveryOptionId;
  paymentMethodId: PaymentMethodId;
  coupon: CouponDiscount | null;
  currentStep: CheckoutStep;
  isProcessing: boolean;
  paymentStatus: 'idle' | 'processing' | 'success' | 'failure' | 'cancelled';
  lastConfirmedOrder: ConfirmedOrder | null;

  setShippingAddress: (address: ShippingAddress) => void;
  setDeliveryOptionId: (id: DeliveryOptionId) => void;
  setPaymentMethodId: (id: PaymentMethodId) => void;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  setCurrentStep: (step: CheckoutStep) => void;
  processPayment: (
    items: CartItem[],
    simulateFailure?: boolean,
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
  lastConfirmedOrder: null,

  setShippingAddress: (address: ShippingAddress) => set({ shippingAddress: address }),

  setDeliveryOptionId: (id: DeliveryOptionId) => set({ deliveryOptionId: id }),

  setPaymentMethodId: (id: PaymentMethodId) => set({ paymentMethodId: id }),

  applyCoupon: (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    const match = DEVELOPMENT_COUPONS[code];
    if (match) {
      set({ coupon: match });
      return { success: true, message: `Coupon ${code} applied successfully!` };
    }
    return { success: false, message: 'Invalid coupon code. Try SHIRT10 or WELCOME20.' };
  },

  removeCoupon: () => set({ coupon: null }),

  setCurrentStep: (step: CheckoutStep) => set({ currentStep: step }),

  processPayment: async (items: CartItem[], simulateFailure = false) => {
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

    if (!config.isProd && simulateFailure) {
      set({ isProcessing: false, paymentStatus: 'failure' });
      return { success: false, error: 'Payment authorization declined by gateway.' };
    }

    const deliveryOption = AVAILABLE_DELIVERY_OPTIONS[deliveryOptionId];
    const paymentMethod: PaymentMethod = AVAILABLE_PAYMENT_METHODS.find(
      p => p.id === paymentMethodId,
    ) ?? {
      id: 'phonepe',
      name: 'PhonePe Secure Payment',
      description: 'Pay securely via UPI, Cards, or NetBanking',
    };
    const pricing = calculateOrderPricing(items, deliveryOptionId, coupon);

    let orderId = `ORD-${Date.now().toString().slice(-6)}`;
    const hasCustomBackend = Boolean(import.meta.env.VITE_API_URL);

    if (config.isProd && hasCustomBackend) {
      try {
        const response = await apiClient.post('/orders/checkout', {
          items,
          shippingAddress,
          deliveryOptionId,
          paymentMethodId,
          couponCode: coupon?.code,
        });
        const serverOrderId = (response.data as { orderId?: string; data?: { orderId?: string } })?.orderId ??
          (response.data as { data?: { orderId?: string } })?.data?.orderId;
        if (!serverOrderId) throw new Error('Checkout response did not include an order reference.');
        orderId = serverOrderId;
      } catch (error) {
        console.warn('Backend checkout endpoint unreachable, placing order locally:', error);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    const confirmedOrder: ConfirmedOrder = {
      orderId,
      createdAt: new Date().toISOString(),
      items: [...items],
      shippingAddress: { ...shippingAddress },
      deliveryOption,
      paymentMethod,
      pricing,
      status: 'confirmed',
    };

    await developmentOrderStore.createOrderFromCheckout(confirmedOrder);

    set({
      isProcessing: false,
      paymentStatus: 'success',
      lastConfirmedOrder: confirmedOrder,
    });

    return { success: true, orderId: confirmedOrder.orderId };
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
      lastConfirmedOrder: null,
    });
  },
}));
