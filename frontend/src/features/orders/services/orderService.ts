import { apiClient, unwrapApiData } from '../../../services/api/client.js';
import type {
  BackendOrderDto,
  BackendOrderItemDto,
  CheckoutRequest,
  CheckoutSession,
  OrderPaymentStatus,
  PageResult,
} from '../../../services/api/contracts.js';
import { toSearchParams } from '../../../services/api/query.js';
import type {
  DeliveryOption,
  PaymentMethod,
  ShippingAddress,
} from '../../checkout/types/checkout.js';
import type { ShirtSize } from '../../products/types/product.js';
import type {
  Order,
  OrderFilterOptions,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  TrackingMilestone,
} from '../types/order.js';

function normalizeOrderStatus(status: string): OrderStatus {
  const s = (status || '').toUpperCase();
  switch (s) {
    case 'CONFIRMED':
      return 'confirmed';
    case 'PROCESSING':
      return 'processing';
    case 'SHIPPED':
      return 'shipped';
    case 'OUT_FOR_DELIVERY':
      return 'out_for_delivery';
    case 'DELIVERED':
      return 'delivered';
    case 'CANCELLED':
      return 'cancelled';
    case 'PAYMENT_FAILED':
    case 'FAILED':
      return 'payment_failed';
    case 'RETURN_REQUESTED':
      return 'return_requested';
    case 'RETURNED':
      return 'returned';
    case 'PENDING':
      return 'pending';
    default:
      throw new Error(`Unsupported order status: ${status}`);
  }
}

function normalizePaymentStatus(status: string): PaymentStatus {
  const s = (status || '').toUpperCase();
  switch (s) {
    case 'SUCCESS':
    case 'PAID':
      return 'paid';
    case 'FAILED':
    case 'EXPIRED':
      return 'failed';
    case 'REFUNDED':
      return 'refunded';
    case 'PENDING':
    case 'INITIATED':
    case 'AUTHORIZED':
    default:
      return 'pending';
  }
}

function normalizeShippingAddress(addr?: BackendOrderDto['shippingAddress']): ShippingAddress {
  if (!addr) {
    return {
      firstName: 'Customer',
      lastName: '',
      phone: '',
      addressLine1: 'Address not available',
      city: '',
      state: '',
      postalCode: '',
      country: 'IN',
    };
  }

  let firstName = addr.firstName || '';
  let lastName = addr.lastName || '';
  if (!firstName && addr.recipientName) {
    const parts = addr.recipientName.trim().split(/\s+/);
    firstName = parts[0] || 'Customer';
    lastName = parts.slice(1).join(' ');
  }

  return {
    firstName: firstName || 'Customer',
    lastName: lastName || '',
    phone: addr.phone || '',
    addressLine1: addr.addressLine1 || addr.line1 || 'Address Line 1',
    addressLine2: addr.addressLine2 || addr.line2 || undefined,
    city: addr.city || '',
    state: addr.state || '',
    postalCode: addr.postalCode || '',
    country: addr.country || 'IN',
  };
}

function normalizeDeliveryOption(chargePaise?: number): DeliveryOption {
  const charge = chargePaise ?? 0;
  const isExpress = charge >= 25000;
  return {
    id: isExpress ? 'express' : 'standard',
    name: isExpress ? 'Express Delivery' : 'Standard Delivery',
    description: isExpress
      ? 'Delivered within 1–2 business days'
      : 'Delivered within 3–5 business days',
    estimatedDelivery: isExpress ? '1–2 business days' : '3–5 business days',
    pricePaise: charge,
    price: charge / 100,
  };
}

function normalizePaymentMethod(payments?: BackendOrderDto['payments']): PaymentMethod {
  const primary = payments?.[0];
  const provider = primary?.provider || 'PHONEPE';
  return {
    id: 'phonepe',
    name: provider === 'COD' ? 'Cash on Delivery' : 'PhonePe / UPI',
    description: provider === 'COD' ? 'Pay upon delivery' : 'Secure Instant UPI Payment',
  };
}

function generateMilestones(
  status: OrderStatus,
  createdAt: string,
  updatedAt: string,
): TrackingMilestone[] {
  const stages: Array<{ status: OrderStatus; title: string; description: string }> = [
    {
      status: 'confirmed',
      title: 'Order Confirmed',
      description: 'Your order has been verified and confirmed.',
    },
    {
      status: 'processing',
      title: 'Processing',
      description: 'The order is being prepared for dispatch.',
    },
    {
      status: 'shipped',
      title: 'Shipped',
      description: 'The order was marked as shipped.',
    },
    {
      status: 'out_for_delivery',
      title: 'Out for Delivery',
      description: 'The order was marked as out for delivery.',
    },
    {
      status: 'delivered',
      title: 'Delivered',
      description: 'Package handed over successfully.',
    },
  ];

  const statusOrder: OrderStatus[] = [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'out_for_delivery',
    'delivered',
  ];
  const currentIndex = statusOrder.indexOf(status);

  if (status === 'cancelled') {
    return [
      {
        status: 'confirmed',
        title: 'Order Placed',
        description: 'Order was placed.',
        timestamp: createdAt,
        completed: true,
        current: false,
      },
      {
        status: 'cancelled',
        title: 'Order Cancelled',
        description: 'This order was cancelled and inventory released.',
        timestamp: updatedAt,
        completed: true,
        current: true,
      },
    ];
  }

  if (status === 'return_requested' || status === 'returned') {
    return [
      {
        status: 'delivered',
        title: 'Order Delivered',
        description: 'Original delivery completed.',
        timestamp: createdAt,
        completed: true,
        current: false,
      },
      {
        status,
        title: status === 'return_requested' ? 'Return Requested' : 'Returned',
        description: status === 'return_requested'
          ? 'Return request is currently under review by our operations team.'
          : 'Returned items have been received and processed.',
        timestamp: updatedAt,
        completed: true,
        current: true,
      },
    ];
  }

  return stages.map((stage) => {
    const stageIndex = statusOrder.indexOf(stage.status);
    const completed = currentIndex >= stageIndex && currentIndex !== -1;
    const current = currentIndex === stageIndex;
    return {
      status: stage.status,
      title: stage.title,
      description: stage.description,
      timestamp: current ? updatedAt : stage.status === 'confirmed' && completed ? createdAt : undefined,
      completed,
      current,
    };
  });
}

function normalizeItems(items?: BackendOrderItemDto[] | null): OrderItem[] {
  return (items || []).map((item) => {
    const unitPricePaise = item.unitPricePaise ?? 0;
    const quantity = item.quantity ?? 1;
    const unitPrice = unitPricePaise / 100;
    const lineTotal = (item.lineTotalPaise ?? unitPricePaise * quantity) / 100;
    const productName = item.productName || item.variant?.product?.name || 'Purvaja Tailored Shirt';
    const slug =
      item.variant?.product?.slug ||
      productName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const image =
      item.variant?.product?.images?.[0]?.url ||
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=800';

    return {
      id: item.id,
      shirtId: item.variant?.productId || item.variantId || item.id || '',
      name: productName,
      slug,
      image,
      size: (item.size as ShirtSize) || 'M',
      color: {
        name: item.colorName || 'Classic',
        hex: item.variant?.colorHex || '#1E293B',
      },
      quantity,
      unitPricePaise,
      unitPrice,
      lineTotalPaise: item.lineTotalPaise,
      lineTotal,
    };
  });
}

export function mapBackendOrderToFrontendOrder(backendDto: BackendOrderDto): Order {
  const status = normalizeOrderStatus(backendDto.status);
  const paymentStatus = normalizePaymentStatus(backendDto.paymentStatus);
  const subtotal = (backendDto.subtotalPaise ?? 0) / 100;
  const couponDiscount = (backendDto.discountPaise ?? 0) / 100;
  const deliveryFee = (backendDto.shippingChargePaise ?? 0) / 100;
  const grandTotal = (backendDto.totalPaise ?? 0) / 100;
  const refunds = (backendDto.payments ?? []).flatMap(payment => (payment.refunds ?? []).map(refund => ({
    id: refund.id,
    amountPaise: refund.amountPaise,
    amount: refund.amountPaise / 100,
    status: refund.status.toLowerCase() as NonNullable<Order['refunds']>[number]['status'],
    mode: refund.mode.toLowerCase() as NonNullable<Order['refunds']>[number]['mode'],
    reason: refund.reason.toLowerCase() as NonNullable<Order['refunds']>[number]['reason'],
    requestedAt: refund.requestedAt,
    processedAt: refund.processedAt ?? undefined,
  })));

  return {
    id: backendDto.id || '',
    orderNumber: backendDto.orderNumber || '',
    createdAt: backendDto.createdAt || new Date().toISOString(),
    status,
    items: normalizeItems(backendDto.items),
    subtotalPaise: backendDto.subtotalPaise,
    subtotal,
    productSavingsPaise: 0,
    productSavings: 0,
    couponDiscountPaise: backendDto.discountPaise,
    couponDiscount,
    deliveryFeePaise: backendDto.shippingChargePaise,
    deliveryFee,
    grandTotalPaise: backendDto.totalPaise,
    grandTotal,
    shippingAddress: normalizeShippingAddress(backendDto.shippingAddress),
    deliveryOption: normalizeDeliveryOption(backendDto.shippingChargePaise),
    paymentMethod: normalizePaymentMethod(backendDto.payments),
    paymentStatus,
    availableActions: backendDto.availableActions,
    refunds,
    trackingMilestones: generateMilestones(
      status,
      backendDto.createdAt || new Date().toISOString(),
      backendDto.updatedAt || backendDto.createdAt || new Date().toISOString(),
    ),
  };
}

export const orderService = {
  async checkout(request: CheckoutRequest): Promise<CheckoutSession> {
    const response = await apiClient.post('/checkout', request, {
      headers: { 'Idempotency-Key': request.idempotencyKey },
    });
    return unwrapApiData<CheckoutSession>(response.data);
  },

  async list(options: OrderFilterOptions = {}): Promise<Order[]> {
    const status = options.status && options.status !== 'all'
      ? options.status.toUpperCase()
      : undefined;
    const response = await apiClient.get(`/orders?${toSearchParams({
      page: options.page ?? 1,
      limit: options.limit ?? 100,
      status,
      search: options.searchQuery || undefined,
      sort: options.sortBy?.replace('_', '-') ?? 'newest',
    })}`);
    const data = unwrapApiData<PageResult<BackendOrderDto>>(response.data);
    return data.items.map(mapBackendOrderToFrontendOrder);
  },

  async getById(orderId: string): Promise<Order> {
    const response = await apiClient.get(`/orders/${encodeURIComponent(orderId)}`);
    const raw = unwrapApiData<BackendOrderDto>(response.data);
    return mapBackendOrderToFrontendOrder(raw);
  },

  async getPaymentStatus(orderId: string): Promise<OrderPaymentStatus> {
    const response = await apiClient.get(`/orders/${encodeURIComponent(orderId)}`);
    const raw = unwrapApiData<BackendOrderDto>(response.data);
    const mappedOrder = mapBackendOrderToFrontendOrder(raw);
    return {
      orderId: mappedOrder.id,
      status: mappedOrder.status,
      paymentStatus: mappedOrder.paymentStatus,
      order: mappedOrder,
    };
  },

  async cancel(orderId: string, reason: string): Promise<Order> {
    const response = await apiClient.post(`/orders/${encodeURIComponent(orderId)}/cancel`, {
      reason,
    });
    const raw = unwrapApiData<BackendOrderDto>(response.data);
    return mapBackendOrderToFrontendOrder(raw);
  },

  async requestReturn(orderId: string, reason: string, items?: Array<{ orderItemId: string; quantity: number }>): Promise<Order> {
    const response = await apiClient.post(`/orders/${encodeURIComponent(orderId)}/returns`, {
      reason,
      items,
    });
    const raw = unwrapApiData<BackendOrderDto>(response.data);
    return mapBackendOrderToFrontendOrder(raw);
  },
};

export interface AdminOrderUpdate {
  status: OrderStatus;
}
