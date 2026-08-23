import { Order, OrderStatus } from '../types/order.js';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'neutral';

export interface StatusMeta {
  label: string;
  variant: BadgeVariant;
  description: string;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusMeta> = {
  pending: {
    label: 'Order Placed',
    variant: 'neutral',
    description: 'We have received your order and are preparing confirmation.',
  },
  confirmed: {
    label: 'Confirmed',
    variant: 'primary',
    description: 'Order confirmed and sent to our tailoring workshop.',
  },
  processing: {
    label: 'Processing',
    variant: 'primary',
    description: 'Shirts are being quality-checked and packaged.',
  },
  shipped: {
    label: 'Shipped',
    variant: 'warning',
    description: 'Package has been dispatched and is in transit.',
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    variant: 'warning',
    description: 'Courier agent is on the way to your delivery address.',
  },
  delivered: {
    label: 'Delivered',
    variant: 'success',
    description: 'Order safely delivered to your doorstep.',
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'error',
    description: 'This order was cancelled.',
  },
  payment_failed: {
    label: 'Payment Failed',
    variant: 'error',
    description: 'Payment authorization could not be completed.',
  },
  returned: {
    label: 'Returned',
    variant: 'neutral',
    description: 'Return request processed and items returned.',
  },
  refunded: {
    label: 'Refunded',
    variant: 'neutral',
    description: 'Refund amount credited back to original payment method.',
  },
};

export const STANDARD_MILESTONE_STATUSES: OrderStatus[] = [
  'confirmed',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
];

export function canCancelOrder(order: Order): boolean {
  const cancellableStatuses: OrderStatus[] = ['pending', 'confirmed', 'processing'];
  return cancellableStatuses.includes(order.status);
}

export function canReturnOrder(order: Order): boolean {
  if (order.status !== 'delivered' || order.returnReason) {
    return false;
  }
  return true;
}

export function canTrackOrder(order: Order): boolean {
  const nonTrackable: OrderStatus[] = ['cancelled', 'payment_failed'];
  return !nonTrackable.includes(order.status);
}
