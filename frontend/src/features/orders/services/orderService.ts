import { apiClient, unwrapApiData } from '../../../services/api/client.js';
import type { CheckoutRequest, CheckoutSession, OrderPaymentStatus } from '../../../services/api/contracts.js';
import { toSearchParams } from '../../../services/api/query.js';
import type { Order, OrderFilterOptions, OrderStatus } from '../types/order.js';

export const orderService = {
  async checkout(request: CheckoutRequest): Promise<CheckoutSession> {
    const response = await apiClient.post('/orders/checkout', request);
    return unwrapApiData<CheckoutSession>(response.data);
  },

  async list(options: OrderFilterOptions = {}): Promise<Order[]> {
    const response = await apiClient.get(`/orders/my-orders?${toSearchParams(options)}`);
    const data = unwrapApiData<Order[] | { items: Order[] }>(response.data);
    return Array.isArray(data) ? data : data.items;
  },

  async getById(orderId: string): Promise<Order> {
    const response = await apiClient.get(`/orders/${encodeURIComponent(orderId)}`);
    return unwrapApiData<Order>(response.data);
  },

  async getPaymentStatus(orderId: string): Promise<OrderPaymentStatus> {
    const response = await apiClient.get(`/orders/${encodeURIComponent(orderId)}/status`);
    return unwrapApiData<OrderPaymentStatus>(response.data);
  },

  async cancel(orderId: string, reason: string): Promise<Order> {
    const response = await apiClient.post(`/orders/${encodeURIComponent(orderId)}/cancel`, { reason });
    return unwrapApiData<Order>(response.data);
  },

  async requestReturn(orderId: string, reason: string): Promise<Order> {
    const response = await apiClient.post(`/orders/${encodeURIComponent(orderId)}/returns`, { reason });
    return unwrapApiData<Order>(response.data);
  },
};

export interface AdminOrderUpdate {
  status: OrderStatus;
}
