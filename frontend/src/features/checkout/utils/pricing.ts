import { CartItem } from '../../../store/cartStore.js';
import {
  DeliveryOption,
  DeliveryOptionId,
  PaymentMethod,
  CouponDiscount,
  OrderPricing,
} from '../types/checkout.js';

export const FREE_SHIPPING_THRESHOLD = 2500;

export const AVAILABLE_DELIVERY_OPTIONS: Record<DeliveryOptionId, DeliveryOption> = {
  standard: {
    id: 'standard',
    name: 'Standard Ground Delivery',
    description: 'Tracked ground transit with SMS & WhatsApp updates',
    estimatedDelivery: '3 - 5 Business Days',
    price: 199,
    freeThreshold: FREE_SHIPPING_THRESHOLD,
  },
  express: {
    id: 'express',
    name: 'Air Express Priority Delivery',
    description: 'Priority air dispatch within 24h with door-to-door tracking',
    estimatedDelivery: '1 - 2 Business Days',
    price: 299,
  },
};

export const AVAILABLE_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'phonepe',
    name: 'PhonePe Secure Payment',
    description: 'Pay securely using UPI through PhonePe.',
    badge: 'Recommended',
  },
];

export function calculateOrderPricing(
  items: CartItem[],
  deliveryOptionId: DeliveryOptionId = 'standard',
  _coupon: CouponDiscount | null = null,
): OrderPricing {
  const subtotal = items.reduce((sum, item) => sum + Math.round(item.price) * item.quantity, 0);

  const productSavings = items.reduce((sum, item) => {
    if (item.compareAtPrice && item.compareAtPrice > item.price) {
      return sum + Math.round(item.compareAtPrice - item.price) * item.quantity;
    }
    return sum;
  }, 0);

  // The server validates promotional eligibility and is the source of truth for discounts.
  const couponDiscount = 0;

  const deliveryOption =
    AVAILABLE_DELIVERY_OPTIONS[deliveryOptionId] || AVAILABLE_DELIVERY_OPTIONS.standard;
  let deliveryFee = 0;
  if (subtotal > 0) {
    if (deliveryOption.id === 'standard') {
      deliveryFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : deliveryOption.price;
    } else {
      deliveryFee = deliveryOption.price;
    }
  }

  const isFreeShipping =
    deliveryOption.id === 'standard' && (subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0);
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const grandTotal = Math.max(0, subtotal - couponDiscount + deliveryFee);

  return {
    subtotal,
    productSavings,
    couponDiscount,
    deliveryFee,
    grandTotal,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    isFreeShipping,
    remainingForFreeShipping,
  };
}
