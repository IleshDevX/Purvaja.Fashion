import { useQuery } from '@tanstack/react-query';
import type { OrderFilterOptions } from '../types/order.js';
import { orderService } from '../services/orderService.js';

export function useOrdersQuery(options: OrderFilterOptions = {}) {
  return useQuery({ queryKey: ['orders', options], queryFn: () => orderService.list(options) });
}

export function useOrderQuery(orderId: string | undefined) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderService.getById(orderId!),
    enabled: Boolean(orderId),
  });
}
