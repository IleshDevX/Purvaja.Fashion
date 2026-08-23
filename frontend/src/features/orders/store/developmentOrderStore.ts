import { Order, OrderStatus, OrderFilterOptions, OrderItem } from '../types/order.js';
import { INITIAL_DEVELOPMENT_ORDERS } from '../data/ordersData.js';
import { canCancelOrder, canReturnOrder } from '../utils/orderStatus.js';
import { ConfirmedOrder } from '../../checkout/types/checkout.js';

// Unified In-Memory Order Storage for Frontend Development
let ordersState: Order[] = [...INITIAL_DEVELOPMENT_ORDERS];

const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: ['returned'],
  cancelled: [],
  payment_failed: [],
  returned: ['refunded'],
  refunded: [],
};

export const developmentOrderStore = {
  /**
   * Retrieves all orders matching optional filter and search criteria.
   */
  async getOrders(options?: OrderFilterOptions): Promise<Order[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    let list = [...ordersState];

    if (options?.status && options.status !== 'all') {
      list = list.filter(o => o.status === options.status);
    }

    if (options?.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.trim().toLowerCase();
      list = list.filter(
        o =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.items.some(item => item.name.toLowerCase().includes(q)),
      );
    }

    if (options?.sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (options?.sortBy === 'total_high') {
      list.sort((a, b) => b.grandTotal - a.grandTotal);
    } else if (options?.sortBy === 'total_low') {
      list.sort((a, b) => a.grandTotal - b.grandTotal);
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  },

  /**
   * Retrieves a single order by ID or order reference number.
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    await new Promise(resolve => setTimeout(resolve, 80));
    const target = orderId.toLowerCase();
    const order = ordersState.find(
      o => o.id.toLowerCase() === target || o.orderNumber.toLowerCase() === target,
    );
    return order ? { ...order } : null;
  },

  /**
   * Appends a newly placed confirmed order from Checkout into development order state.
   */
  async createOrderFromCheckout(confirmed: ConfirmedOrder): Promise<Order> {
    await new Promise(resolve => setTimeout(resolve, 150));

    const orderItems: OrderItem[] = confirmed.items.map((item, idx) => ({
      id: `item-${Date.now().toString(36)}-${idx}`,
      shirtId: item.shirtId,
      name: item.name,
      slug: item.slug,
      image: item.image,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unitPrice: item.price,
      lineTotal: item.price * item.quantity,
    }));

    const newOrder: Order = {
      id: `ord-${Date.now().toString(36)}`,
      orderNumber: confirmed.orderId,
      createdAt: confirmed.createdAt,
      status: 'confirmed',
      items: orderItems,
      subtotal: confirmed.pricing.subtotal,
      productSavings: confirmed.pricing.productSavings,
      couponDiscount: confirmed.pricing.couponDiscount,
      deliveryFee: confirmed.pricing.deliveryFee,
      grandTotal: confirmed.pricing.grandTotal,
      shippingAddress: { ...confirmed.shippingAddress },
      deliveryOption: { ...confirmed.deliveryOption },
      paymentMethod: { ...confirmed.paymentMethod },
      // Client-created development orders are not proof of settlement.
      paymentStatus: confirmed.paymentMethod.id === 'cod' ? 'pending' : 'pending',
      trackingNumber: `TRK-EX-${Math.floor(100000 + Math.random() * 900000)}`,
      courierName: 'BlueDart Air Express',
      estimatedDelivery: '3-4 Business Days',
      trackingMilestones: [
        {
          status: 'confirmed',
          title: 'Order Confirmed',
          description: 'Payment authorized and order sent to tailoring workshop',
          timestamp: new Date().toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          completed: true,
          current: true,
          location: 'Central Fulfillment Hub',
        },
        {
          status: 'processing',
          title: 'Tailored & Packaged',
          description: 'Quality check and gift box packaging',
          completed: false,
          current: false,
        },
        {
          status: 'shipped',
          title: 'Dispatched via Air',
          description: 'Handed to courier carrier partner',
          completed: false,
          current: false,
        },
        {
          status: 'out_for_delivery',
          title: 'Out for Delivery',
          description: 'Courier agent delivering to address',
          completed: false,
          current: false,
        },
        {
          status: 'delivered',
          title: 'Delivered',
          description: 'Doorstep delivery confirmation',
          completed: false,
          current: false,
        },
      ],
    };

    ordersState.unshift(newOrder);
    return newOrder;
  },

  /**
   * Updates an order's fulfillment status adhering to transition rules.
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
  ): Promise<{ success: boolean; message: string; order?: Order }> {
    await new Promise(resolve => setTimeout(resolve, 150));
    const order = ordersState.find(
      o =>
        o.id.toLowerCase() === orderId.toLowerCase() ||
        o.orderNumber.toLowerCase() === orderId.toLowerCase(),
    );

    if (!order) {
      return { success: false, message: 'Order not found.' };
    }

    const allowed = ALLOWED_STATUS_TRANSITIONS[order.status] || [];
    if (!allowed.includes(newStatus)) {
      return {
        success: false,
        message: `Invalid status transition from ${order.status.toUpperCase()} to ${newStatus.toUpperCase()}.`,
      };
    }

    order.status = newStatus;

    // Update tracking milestones if applicable
    order.trackingMilestones.forEach(m => {
      if (m.status === newStatus) {
        m.completed = true;
        m.current = true;
        m.timestamp = new Date().toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } else if (m.completed && m.status !== newStatus) {
        m.current = false;
      }
    });

    return {
      success: true,
      message: `Order #${order.orderNumber} status updated to ${newStatus.toUpperCase()}.`,
      order: { ...order },
    };
  },

  /**
   * Cancels an order if eligible.
   */
  async cancelOrder(
    orderId: string,
    reason: string,
  ): Promise<{ success: boolean; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 150));
    const order = ordersState.find(
      o =>
        o.id.toLowerCase() === orderId.toLowerCase() ||
        o.orderNumber.toLowerCase() === orderId.toLowerCase(),
    );

    if (!order) {
      return { success: false, message: 'Order not found.' };
    }

    if (!canCancelOrder(order)) {
      return {
        success: false,
        message: 'This order has already been dispatched and cannot be cancelled online.',
      };
    }

    order.status = 'cancelled';
    order.cancellationReason = reason;
    order.cancelledAt = new Date().toISOString();

    return {
      success: true,
      message: `Order #${order.orderNumber} has been cancelled successfully.`,
    };
  },

  /**
   * Requests a return for a delivered order.
   */
  async requestReturn(
    orderId: string,
    _itemId: string,
    reason: string,
  ): Promise<{ success: boolean; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 150));
    const order = ordersState.find(
      o =>
        o.id.toLowerCase() === orderId.toLowerCase() ||
        o.orderNumber.toLowerCase() === orderId.toLowerCase(),
    );

    if (!order) {
      return { success: false, message: 'Order not found.' };
    }

    if (!canReturnOrder(order)) {
      return {
        success: false,
        message: 'This order is not eligible for returns.',
      };
    }

    order.status = 'returned';
    order.returnReason = reason;
    order.returnedAt = new Date().toISOString();

    return {
      success: true,
      message: `Return request submitted for Order #${order.orderNumber}. Our courier agent will coordinate pickup.`,
    };
  },

  /**
   * Resets development session orders to initial defaults.
   */
  resetOrders(): void {
    ordersState = [...INITIAL_DEVELOPMENT_ORDERS];
  },
};
