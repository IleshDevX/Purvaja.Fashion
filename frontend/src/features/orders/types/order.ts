import { ShippingAddress, DeliveryOption, PaymentMethod } from '../../checkout/types/checkout.js';
import { ShirtSize } from '../../products/types/product.js';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'payment_failed'
  | 'returned'
  | 'refunded';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderItem {
  id: string;
  shirtId: string;
  name: string;
  slug: string;
  image: string;
  size: ShirtSize;
  color: {
    name: string;
    hex: string;
  };
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface TrackingMilestone {
  status: OrderStatus;
  title: string;
  description: string;
  timestamp?: string;
  completed: boolean;
  current: boolean;
  location?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  productSavings: number;
  couponDiscount: number;
  deliveryFee: number;
  grandTotal: number;
  shippingAddress: ShippingAddress;
  deliveryOption: DeliveryOption;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  trackingNumber?: string;
  courierName?: string;
  estimatedDelivery?: string;
  trackingMilestones: TrackingMilestone[];
  cancellationReason?: string;
  cancelledAt?: string;
  returnReason?: string;
  returnedAt?: string;
}

export interface OrderFilterOptions {
  status?: OrderStatus | 'all';
  searchQuery?: string;
  sortBy?: 'newest' | 'oldest' | 'total_high' | 'total_low';
}
