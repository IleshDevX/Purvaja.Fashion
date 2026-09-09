import type { Order, OrderStatus, PaymentStatus } from '../../features/orders/types/order.js';
import type { Shirt } from '../../features/products/types/product.js';

export interface PageResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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
  cartSnapshot: Array<{ variantId: string; quantity: number; unitPricePaise: number }>;
}

export type BackendPaymentStatus =
  | 'PENDING'
  | 'INITIATED'
  | 'AUTHORIZED'
  | 'PAID'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface CheckoutSession {
  paymentId: string;
  orderId: string;
  paymentStatus: BackendPaymentStatus;
  initiationStatus?: 'READY' | 'LEASED' | 'SUCCEEDED' | 'UNKNOWN' | 'FAILED';
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
  minPricePaise?: number;
  maxPricePaise?: number;
  minRating?: number;
  inStock?: boolean;
  deals?: boolean;
  newArrivals?: boolean;
  sort?: string;
  limit?: number;
  ids?: string[];
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

export interface BackendOrderItemDto {
  id: string;
  orderId: string;
  variantId?: string | null;
  productName: string;
  sku: string;
  size: string;
  colorName: string;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
  createdAt?: string;
  variant?: {
    id?: string;
    productId?: string;
    colorHex?: string;
    product?: {
      name?: string;
      slug?: string;
      images?: Array<{ url: string }>;
    };
  } | null;
}

export interface BackendOrderDto {
  id: string;
  orderNumber: string;
  userId: string;
  shippingAddress: {
    recipientName?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    firstName?: string;
    lastName?: string;
    addressLine1?: string;
    addressLine2?: string;
  };
  billingAddress?: unknown;
  subtotalPaise: number;
  discountPaise: number;
  shippingChargePaise: number;
  taxPaise: number;
  totalPaise: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  items: BackendOrderItemDto[];
  payments?: Array<{
    id: string;
    provider: string;
    method: string;
    amountPaise: number;
    status: string;
    providerReference?: string | null;
    createdAt: string;
    refunds?: Array<{
      id: string;
      amountPaise: number;
      status: 'REQUESTED' | 'PENDING' | 'SUCCEEDED' | 'FAILED';
      mode: 'DEMO' | 'LIVE' | 'UNKNOWN';
      reason: 'ORDER_CANCELLED' | 'RETURN' | 'LATE_CAPTURE' | 'LEGACY';
      providerReference?: string | null;
      requestedAt: string;
      processedAt?: string | null;
    }>;
  }>;
  returnRequest?: {
    id: string;
    status: string;
    reason: string;
    createdAt: string;
    updatedAt: string;
    items: Array<{ orderItemId: string; quantity: number }>;
  } | null;
  availableActions: { canCancel: boolean; canReturn: boolean };
}
