import { apiClient, unwrapApiData } from '../../../services/api/client.js';
import type { Order, OrderStatus } from '../../orders/types/order.js';
import type { ProductFormValues } from '../schemas/productFormSchema.js';
import type {
  AdminCustomer,
  AdminDashboardMetrics,
  AdminSalesPoint,
  AdminStoreSettings,
  InventoryItem,
} from '../types/admin.js';
import type { Shirt } from '../../products/types/product.js';

export const adminService = {
  async getDashboardMetrics(): Promise<AdminDashboardMetrics> {
    const response = await apiClient.get('/admin/analytics/metrics');
    return unwrapApiData<AdminDashboardMetrics>(response.data);
  },
  async getSalesChartData(timeframe: 'daily' | 'weekly' | 'monthly'): Promise<AdminSalesPoint[]> {
    const response = await apiClient.get(`/admin/analytics/sales?timeframe=${timeframe}`);
    return unwrapApiData<AdminSalesPoint[]>(response.data);
  },
  async getTopProducts(): Promise<Array<{ product: Shirt; unitsSold: number; totalRevenue: number }>> {
    const response = await apiClient.get('/admin/analytics/top-products');
    return unwrapApiData<Array<{ product: Shirt; unitsSold: number; totalRevenue: number }>>(response.data);
  },
  async getCustomers(search = ''): Promise<AdminCustomer[]> {
    const response = await apiClient.get(`/admin/customers?search=${encodeURIComponent(search)}`);
    return unwrapApiData<AdminCustomer[]>(response.data);
  },
  async getInventory(filter: string): Promise<InventoryItem[]> {
    const response = await apiClient.get(`/admin/inventory?filter=${encodeURIComponent(filter)}`);
    return unwrapApiData<InventoryItem[]>(response.data);
  },
  async updateVariantStock(variantId: string, stock: number): Promise<InventoryItem> {
    const response = await apiClient.patch(`/admin/inventory/${encodeURIComponent(variantId)}`, { stock });
    return unwrapApiData<InventoryItem>(response.data);
  },
  async getSettings(): Promise<AdminStoreSettings> {
    const response = await apiClient.get('/admin/settings');
    return unwrapApiData<AdminStoreSettings>(response.data);
  },
  async updateSettings(settings: AdminStoreSettings): Promise<AdminStoreSettings> {
    const response = await apiClient.put('/admin/settings', settings);
    return unwrapApiData<AdminStoreSettings>(response.data);
  },
  async createProduct(values: ProductFormValues): Promise<Shirt> {
    const response = await apiClient.post('/admin/products', values);
    return unwrapApiData<Shirt>(response.data);
  },
  async listProducts(): Promise<Shirt[]> {
    const response = await apiClient.get('/admin/products');
    return unwrapApiData<Shirt[]>(response.data);
  },
  async updateProduct(id: string, values: ProductFormValues): Promise<Shirt> {
    const response = await apiClient.put(`/admin/products/${encodeURIComponent(id)}`, values);
    return unwrapApiData<Shirt>(response.data);
  },
  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(`/admin/products/${encodeURIComponent(id)}`);
  },
  async listOrders(): Promise<Order[]> {
    const response = await apiClient.get('/admin/orders');
    return unwrapApiData<Order[]>(response.data);
  },
  async getOrder(id: string): Promise<Order> {
    const response = await apiClient.get(`/admin/orders/${encodeURIComponent(id)}`);
    return unwrapApiData<Order>(response.data);
  },
  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    const response = await apiClient.patch(`/admin/orders/${encodeURIComponent(id)}`, { status });
    return unwrapApiData<Order>(response.data);
  },
};
