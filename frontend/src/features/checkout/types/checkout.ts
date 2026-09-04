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
  percentOff?: number;
  fixedOff?: number;
  description: string;
}

export interface OrderPricing {
  subtotal: number;
  productSavings: number;
  couponDiscount: number;
  deliveryFee: number;
  grandTotal: number;
  freeShippingThreshold: number;
  isFreeShipping: boolean;
  remainingForFreeShipping: number;
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
