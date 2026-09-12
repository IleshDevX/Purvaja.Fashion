import { CartItem } from '../../../store/cartStore.js';
import { commercePolicy } from '@purvaja/commerce-policy';
import {
  DeliveryOption,
  DeliveryOptionId,
  PaymentMethod,
  CouponDiscount,
  OrderPricing,
} from '../types/checkout.js';

export const FREE_SHIPPING_THRESHOLD = commercePolicy.freeShippingThresholdPaise / 100;
export const FREE_SHIPPING_THRESHOLD_PAISE = FREE_SHIPPING_THRESHOLD * 100;

export const AVAILABLE_DELIVERY_OPTIONS: Record<DeliveryOptionId, DeliveryOption> = {
  standard: {
    id: 'standard',
    name: 'Standard Ground Delivery',
    description: 'Standard delivery for supported Indian addresses',
    estimatedDelivery: 'Delivery date confirmed after dispatch',
    pricePaise: commercePolicy.standardShippingPaise,
    price: commercePolicy.standardShippingPaise / 100,
    freeThreshold: FREE_SHIPPING_THRESHOLD,
  },
  express: {
    id: 'express',
    name: 'Air Express Priority Delivery',
    description: 'Faster delivery for supported Indian addresses',
    estimatedDelivery: 'Delivery date confirmed after dispatch',
    pricePaise: commercePolicy.expressShippingPaise,
    price: commercePolicy.expressShippingPaise / 100,
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
  coupon: CouponDiscount | null = null,
): OrderPricing {
  const subtotalPaise = items.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);
  const subtotal = subtotalPaise / 100;

  const productSavingsPaise = items.reduce((sum, item) =>
    sum + Math.max(0, (item.compareAtPricePaise ?? item.pricePaise) - item.pricePaise) * item.quantity, 0);
  const productSavings = productSavingsPaise / 100;

  let couponDiscountPaise = 0;
  const couponEligibilityError = coupon?.minimumOrderPaise && subtotalPaise < coupon.minimumOrderPaise
    ? `Coupon requires a bag subtotal of ₹${(coupon.minimumOrderPaise / 100).toLocaleString('en-IN')}.`
    : null;
  if (coupon && subtotalPaise > 0 && !couponEligibilityError) {
    couponDiscountPaise = coupon.discountType === 'PERCENTAGE'
      ? Math.floor((subtotalPaise * coupon.discountValue) / 100)
      : coupon.discountValue;
    if (coupon.maximumDiscountPaise !== null) {
      couponDiscountPaise = Math.min(couponDiscountPaise, coupon.maximumDiscountPaise);
    }
    couponDiscountPaise = Math.min(couponDiscountPaise, subtotalPaise);
  }
  const couponDiscount = couponDiscountPaise / 100;

  const deliveryOption =
    AVAILABLE_DELIVERY_OPTIONS[deliveryOptionId] || AVAILABLE_DELIVERY_OPTIONS.standard;
  let deliveryFeePaise = 0;
  const discountedSubtotalPaise = subtotalPaise - couponDiscountPaise;
  if (subtotalPaise > 0) {
    if (deliveryOption.id === 'standard') {
      deliveryFeePaise = discountedSubtotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE ? 0 : deliveryOption.pricePaise;
    } else {
      deliveryFeePaise = deliveryOption.pricePaise;
    }
  }
  const deliveryFee = deliveryFeePaise / 100;

  const isFreeShipping =
    deliveryOption.id === 'standard' && (discountedSubtotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE || subtotalPaise === 0);
  const remainingForFreeShippingPaise = Math.max(0, FREE_SHIPPING_THRESHOLD_PAISE - discountedSubtotalPaise);
  const remainingForFreeShipping = remainingForFreeShippingPaise / 100;
  const grandTotalPaise = Math.max(0, subtotalPaise - couponDiscountPaise + deliveryFeePaise);
  const grandTotal = grandTotalPaise / 100;

  return {
    subtotalPaise,
    subtotal,
    productSavingsPaise,
    productSavings,
    couponDiscountPaise,
    couponDiscount,
    deliveryFeePaise,
    deliveryFee,
    grandTotalPaise,
    grandTotal,
    freeShippingThresholdPaise: FREE_SHIPPING_THRESHOLD_PAISE,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    isFreeShipping,
    remainingForFreeShippingPaise,
    remainingForFreeShipping,
    couponEligibilityError,
  };
}
