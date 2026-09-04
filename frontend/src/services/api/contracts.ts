import type { ShippingAddress } from '../../features/checkout/types/checkout.js';
import type { Order, OrderStatus, PaymentStatus } from '../../features/orders/types/order.js';
import type { Shirt } from '../../features/products/types/product.js';

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CheckoutLineInput {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface CheckoutRequest {
  lines: CheckoutLineInput[];
  shippingAddress: ShippingAddress;
  deliveryOptionId: 'standard' | 'express';
  paymentMethodId: 'phonepe' | 'cod';
  couponCode?: string;
}

export interface CheckoutSession {
  orderId: string;
  paymentStatus: PaymentStatus;
  redirectUrl?: string;
}

export interface OrderPaymentStatus {
  orderId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  order?: Order;
}

export interface ProductListParams {
  search?: string;
  category?: string;
  fit?: string[];
  fabric?: string[];
  size?: string[];
  color?: string[];
  sleeve?: string[];
  pattern?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
  deals?: boolean;
  newArrivals?: boolean;
  sort?: string;
  limit?: number;
}

export interface ProductDetailResult {
  product: Shirt;
  relatedProducts: Shirt[];
}

export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
}
