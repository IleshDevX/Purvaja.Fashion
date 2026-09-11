import { CartItem } from '../../../store/cartStore.js';

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export type DeliveryOptionId = 'standard' | 'express';

export interface DeliveryOption {
  id: DeliveryOptionId;
  name: string;
  description: string;
  estimatedDelivery: string;
  pricePaise: number;
  price: number;
  freeThreshold?: number;
}

export type PaymentMethodId = 'phonepe';

export interface PaymentMethod {
  id: PaymentMethodId;
  name: string;
  description: string;
  badge?: string;
}

export interface CouponDiscount {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minimumOrderPaise: number | null;
  maximumDiscountPaise: number | null;
  description: string;
}

export interface OrderPricing {
  subtotalPaise: number;
  subtotal: number;
  productSavingsPaise: number;
  productSavings: number;
  couponDiscountPaise: number;
  couponDiscount: number;
  deliveryFeePaise: number;
  deliveryFee: number;
  grandTotalPaise: number;
  grandTotal: number;
  freeShippingThresholdPaise: number;
  freeShippingThreshold: number;
  isFreeShipping: boolean;
  remainingForFreeShippingPaise: number;
  remainingForFreeShipping: number;
  couponEligibilityError: string | null;
}

export type CheckoutStep = 'address' | 'delivery' | 'review' | 'payment';

export interface ConfirmedOrder {
  orderId: string;
  createdAt: string;
  items: CartItem[];
  shippingAddress: ShippingAddress;
  deliveryOption: DeliveryOption;
  paymentMethod: PaymentMethod;
  pricing: OrderPricing;
  status: 'confirmed' | 'processing';
}
