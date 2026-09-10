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
  | 'return_requested'
  | 'returned';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';

export interface PaymentRefund {
  id: string;
  amountPaise: number;
  amount: number;
  status: 'requested' | 'pending' | 'succeeded' | 'failed';
  mode: 'demo' | 'live' | 'unknown';
  reason: 'order_cancelled' | 'return' | 'late_capture' | 'legacy';
  requestedAt: string;
  processedAt?: string;
}

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
  unitPricePaise: number;
  unitPrice: number;
  lineTotalPaise: number;
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
  shippingAddress: ShippingAddress;
  deliveryOption: DeliveryOption;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  availableActions: { canCancel: boolean; canReturn: boolean };
  refunds?: PaymentRefund[];
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
  page?: number;
  limit?: number;
}
