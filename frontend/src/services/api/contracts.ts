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
  addressId?: string;
  shippingAddress: { recipientName: string; phone: string; line1: string; line2?: string; city: string; state: string; postalCode: string; country: string };
  deliveryOptionId: 'standard' | 'express';
  couponCode?: string;
  idempotencyKey?: string;
}

export interface CheckoutSession {
  paymentId: string;
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
  page?: number;
  search?: string;
  category?: string;
  fit?: string[];
  fabric?: string[];
  size?: string[];
  color?: string[];
  sleeve?: string[];
  collar?: string[];
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
