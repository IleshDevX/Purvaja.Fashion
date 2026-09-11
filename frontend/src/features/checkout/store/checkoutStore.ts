import { create } from 'zustand';
import { CartItem, useCartStore } from '../../../store/cartStore.js';
import {
  ShippingAddress,
  DeliveryOptionId,
  PaymentMethodId,
  CouponDiscount,
  CheckoutStep,
} from '../types/checkout.js';
import type { CheckoutSession } from '../../../services/api/contracts.js';
import { orderService } from '../../orders/services/orderService.js';
import { apiClient, unwrapApiData } from '../../../services/api/client.js';
import { useAuthStore } from '../../auth/store/authStore.js';

let checkoutGeneration = 0;
const CHECKOUT_ATTEMPT_STORAGE_KEY = 'purvaja-checkout-attempt-v1';

interface PersistedCheckoutAttempt {
  ownerId: string;
  fingerprint: string;
  idempotencyKey: string;
}

function clearPersistedCheckoutAttempt() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(CHECKOUT_ATTEMPT_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in restricted browser contexts. The in-memory
    // attempt remains valid for the current page lifecycle.
  }
}

function readPersistedCheckoutAttempt(): PersistedCheckoutAttempt | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const value = JSON.parse(sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY) ?? 'null') as Partial<PersistedCheckoutAttempt> | null;
    if (!value || typeof value.ownerId !== 'string' || typeof value.fingerprint !== 'string' || typeof value.idempotencyKey !== 'string') return null;
    return value as PersistedCheckoutAttempt;
  } catch {
    clearPersistedCheckoutAttempt();
    return null;
  }
}

function persistCheckoutAttempt(attempt: PersistedCheckoutAttempt) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(CHECKOUT_ATTEMPT_STORAGE_KEY, JSON.stringify(attempt));
  } catch {
    // A storage restriction must not block checkout; server idempotency still
    // protects retries made during this page lifecycle.
  }
}

async function checkoutFingerprint(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

interface CheckoutState {
  shippingAddress: ShippingAddress | null;
  deliveryOptionId: DeliveryOptionId;
  paymentMethodId: PaymentMethodId;
  coupon: CouponDiscount | null;
  currentStep: CheckoutStep;
  isProcessing: boolean;
  paymentStatus: 'idle' | 'processing' | 'success' | 'failure' | 'cancelled';
  lastCheckout: CheckoutSession | null;
  checkoutIdempotencyKey: string | null;

  setShippingAddress: (address: ShippingAddress) => void;
  setDeliveryOptionId: (id: DeliveryOptionId) => void;
  setPaymentMethodId: (id: PaymentMethodId) => void;
  applyCoupon: (code: string, subtotalPaise?: number) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  setCurrentStep: (step: CheckoutStep) => void;
  resetIdempotencyKey: () => void;
  processPayment: (
    items: CartItem[],
  ) => Promise<{ success: boolean; orderId?: string; paymentId?: string; redirectUrl?: string; error?: string }>;
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
  checkoutIdempotencyKey: null,

  setShippingAddress: (address: ShippingAddress) =>
    set({ shippingAddress: address, checkoutIdempotencyKey: null }),

  setDeliveryOptionId: (id: DeliveryOptionId) =>
    set({ deliveryOptionId: id, checkoutIdempotencyKey: null }),

  setPaymentMethodId: (id: PaymentMethodId) => set({ paymentMethodId: id }),

  applyCoupon: async (rawCode: string, requestedSubtotalPaise?: number) => {
    const generation = checkoutGeneration;
    const code = rawCode.trim().toUpperCase();
    if (!code) return { success: false, message: 'Enter a promotional code.' };
    try {
      const subtotalPaise = requestedSubtotalPaise ?? useCartStore.getState().getSubtotalPaise();
      const response = await apiClient.post('/coupons/validate', {
        code,
        subtotalPaise,
      });
      const data = unwrapApiData<{
        code: string;
        discountType: 'PERCENTAGE' | 'FIXED';
        discountValue: number;
        discountPaise: number;
        discountRupees: number;
        minimumOrderPaise: number | null;
        maximumDiscountPaise: number | null;
      }>(response.data);

      if (generation !== checkoutGeneration) return { success: false, message: 'Your session changed. Please try again.' };
      set({
        checkoutIdempotencyKey: null,
        coupon: {
          code: data.code,
          discountType: data.discountType,
          discountValue: data.discountValue,
          minimumOrderPaise: data.minimumOrderPaise,
          maximumDiscountPaise: data.maximumDiscountPaise,
          description: data.discountType === 'PERCENTAGE'
            ? `${data.discountValue}% promotional discount applied.`
            : `₹${data.discountValue / 100} promotional discount, subject to coupon eligibility.`,
        },
      });
      return {
        success: true,
        message: `Coupon "${data.code}" applied! You save ₹${data.discountRupees}.`,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid or expired promotional code.';
      return { success: false, message };
    }
  },

  removeCoupon: () => set({ coupon: null, checkoutIdempotencyKey: null }),

  setCurrentStep: (step: CheckoutStep) => set({ currentStep: step }),

  resetIdempotencyKey: () => {
    clearPersistedCheckoutAttempt();
    set({ checkoutIdempotencyKey: null });
  },

  processPayment: async (items: CartItem[]) => {
    const generation = checkoutGeneration;
    if (get().isProcessing) {
      return { success: false, error: 'Payment is already being processed.' };
    }

    const { shippingAddress, deliveryOptionId, coupon } = get();

    if (!shippingAddress) {
      return { success: false, error: 'Shipping address is missing.' };
    }
    if (items.length === 0) {
      return { success: false, error: 'Shopping bag is empty.' };
    }

    set({ isProcessing: true, paymentStatus: 'processing' });

    try {
      // Reconcile server cart state without destructive replacement
      await useCartStore.getState().syncWithServer();
      if (generation !== checkoutGeneration) return { success: false, error: 'Your session changed.' };

      const ownerId = useAuthStore.getState().user?.id ?? 'authenticated-session';
      const request = {
        shippingAddress: {
          recipientName: `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim(),
          phone: shippingAddress.phone,
          line1: shippingAddress.addressLine1,
          line2: shippingAddress.addressLine2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
          country: 'IN',
        },
        deliveryOptionId,
        couponCode: coupon?.code,
        // Preserve the exact lines and prices the customer reviewed. The API
        // compares this snapshot after acquiring product/variant locks.
        cartSnapshot: items.map(item => ({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPricePaise: item.pricePaise,
        })).sort((a, b) => a.variantId.localeCompare(b.variantId)),
      };
      const fingerprint = await checkoutFingerprint({ ownerId, ...request });
      const persisted = readPersistedCheckoutAttempt();
      let idempotencyKey = persisted?.ownerId === ownerId && persisted.fingerprint === fingerprint
        ? persisted.idempotencyKey
        : crypto.randomUUID();
      const inMemoryKey = get().checkoutIdempotencyKey;
      if (inMemoryKey && persisted?.fingerprint === fingerprint) idempotencyKey = inMemoryKey;
      persistCheckoutAttempt({ ownerId, fingerprint, idempotencyKey });
      set({ checkoutIdempotencyKey: idempotencyKey });

      const checkout = await orderService.checkout({ ...request, idempotencyKey });

      if (generation !== checkoutGeneration) return { success: false, error: 'Your session changed.' };
      if (!checkout.orderId || !checkout.paymentId) {
        throw new Error('Checkout response was invalid.');
      }

      set({
        isProcessing: false,
        paymentStatus: 'processing',
        lastCheckout: checkout,
        checkoutIdempotencyKey: idempotencyKey,
      });
      return {
        success: true,
        orderId: checkout.orderId,
        paymentId: checkout.paymentId,
        redirectUrl: checkout.redirectUrl,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Payment could not be processed.';
      if (generation === checkoutGeneration) set({ isProcessing: false, paymentStatus: 'failure' });
      return { success: false, error: message };
    }
  },

  resetCheckout: () => {
    checkoutGeneration++;
    clearPersistedCheckoutAttempt();
    set({
      shippingAddress: null,
      deliveryOptionId: 'standard',
      paymentMethodId: 'phonepe',
      coupon: null,
      currentStep: 'address',
      isProcessing: false,
      paymentStatus: 'idle',
      lastCheckout: null,
      checkoutIdempotencyKey: null,
    });
  },
}));

useAuthStore.subscribe((state, previous) => {
  // If user transitions from authenticated to guest / logged out (explicit logout or session expiry)
  if (previous.user && !state.user && state.status !== 'loading') {
    useCheckoutStore.getState().resetCheckout();
    return;
  }

  // If status transitions away from authenticated to guest/unauthenticated (not loading)
  if (previous.status === 'authenticated' && state.status !== 'authenticated' && state.status !== 'loading') {
    useCheckoutStore.getState().resetCheckout();
    return;
  }

  // If a different user account is detected
  if (state.user && previous.user && state.user.id !== previous.user.id) {
    useCheckoutStore.getState().resetCheckout();
    return;
  }

  // When a user authenticates (initial hydration or login)
  if (state.user) {
    const persisted = readPersistedCheckoutAttempt();
    // Clear foreign attempts that do not belong to this user
    if (persisted && persisted.ownerId !== state.user.id) {
      useCheckoutStore.getState().resetCheckout();
      return;
    }
  }
});
