import { apiClient, unwrapApiData } from '../../../services/api/client.js';
import type {
  AdminCategory,
  AdminCoupon,
  AdminCustomer,
  AdminCustomerDetail,
  AdminDashboardMetrics,
  AdminOrder,
  AdminOrderItem,
  AdminOrderTransition,
  AdminPage,
  AdminPayment,
  AdminProduct,
  AdminProductImage,
  AdminProductInput,
  AdminProductVariant,
  AdminShippingAddress,
  AdminVariant,
  AuditLog,
  InventoryItem,
  InventoryMovement,
  InventoryReservation,
} from '../types/admin.js';

interface BackendCategoryLink {
  productId?: string;
  categoryId?: string;
  category: AdminCategory;
}

interface BackendProduct {
  id: string;
  slug: string;
  name: string;
  tagline?: string | null;
  description: string;
  brand?: string;
  basePricePaise: number;
  compareAtPricePaise?: number | null;
  discountPercent?: number | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  fit?: string | null;
  fabric?: string | null;
  collar?: string | null;
  sleeve?: string | null;
  pattern?: string | null;
  careInstructions?: string[];
  rating?: number | string;
  reviewCount?: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isDeal?: boolean;
  createdAt: string;
  updatedAt: string;
  categories: BackendCategoryLink[];
  variants: AdminProductVariant[];
  images: AdminProductImage[];
}

interface BackendOrder {
  id: string;
  orderNumber: string;
  userId: string;
  status: AdminOrder['status'];
  paymentStatus: string;
  subtotalPaise: number;
  discountPaise: number;
  shippingChargePaise: number;
  taxPaise: number;
  totalPaise: number;
  shippingAddress: AdminShippingAddress;
  billingAddress?: AdminShippingAddress | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    status?: string;
  };
  items: AdminOrderItem[];
  payments: AdminPayment[];
}

const query = (page = 1, limit = 25, search = '') =>
  `?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`;

const read = <T>(response: { data: unknown }) => unwrapApiData<T>(response.data);

function mapProduct(dto: BackendProduct): AdminProduct {
  return {
    ...dto,
    categories: (dto.categories ?? []).map(link => link.category),
    variants: dto.variants ?? [],
    images: dto.images ?? [],
  };
}

function mapOrder(dto: BackendOrder): AdminOrder {
  return {
    ...dto,
    customer: dto.user,
    paymentProvider: dto.payments?.[0]?.provider ?? null,
    payments: dto.payments ?? [],
    items: dto.items ?? [],
  };
}

function mapProductPage(page: AdminPage<BackendProduct>): AdminPage<AdminProduct> {
  return {
    ...page,
    items: page.items.map(mapProduct),
  };
}

function mapOrderPage(page: AdminPage<BackendOrder>): AdminPage<AdminOrder> {
  return {
    ...page,
    items: page.items.map(mapOrder),
  };
}

export const adminService = {
  async getDashboardMetrics(): Promise<AdminDashboardMetrics> {
    const raw = read<Omit<AdminDashboardMetrics, 'recentOrders'> & { recentOrders: BackendOrder[] }>(
      await apiClient.get('/admin/dashboard'),
    );
    return {
      ...raw,
      recentOrders: (raw.recentOrders ?? []).map(mapOrder),
    };
  },

  async listProducts(search = '', page = 1): Promise<AdminPage<AdminProduct>> {
    const raw = read<AdminPage<BackendProduct>>(
      await apiClient.get(`/admin/products${query(page, 25, search)}`),
    );
    return mapProductPage(raw);
  },

  async getProduct(id: string): Promise<AdminProduct> {
    const raw = read<BackendProduct>(
      await apiClient.get(`/admin/products/${encodeURIComponent(id)}`),
    );
    return mapProduct(raw);
  },

  async createProduct(value: AdminProductInput): Promise<AdminProduct> {
    const payload = {
      ...value,
      categoryIds: value.categoryIds && value.categoryIds.length > 0 ? value.categoryIds : undefined,
    };
    const raw = read<BackendProduct>(await apiClient.post('/admin/products', payload));
    return mapProduct(raw);
  },

  async updateProduct(id: string, value: Partial<AdminProductInput>): Promise<AdminProduct> {
    const payload = {
      ...value,
      categoryIds: value.categoryIds && value.categoryIds.length > 0 ? value.categoryIds : undefined,
    };
    const raw = read<BackendProduct>(
      await apiClient.patch(`/admin/products/${encodeURIComponent(id)}`, payload),
    );
    return mapProduct(raw);
  },

  async archiveProduct(id: string): Promise<AdminProduct> {
    return this.updateProduct(id, { status: 'ARCHIVED' });
  },

  async listOrders(search = '', page = 1): Promise<AdminPage<AdminOrder>> {
    const raw = read<AdminPage<BackendOrder>>(
      await apiClient.get(`/admin/orders${query(page, 25, search)}`),
    );
    return mapOrderPage(raw);
  },

  async getOrder(id: string): Promise<AdminOrder> {
    const raw = read<BackendOrder>(
      await apiClient.get(`/admin/orders/${encodeURIComponent(id)}`),
    );
    return mapOrder(raw);
  },

  async updateOrderStatus(id: string, status: AdminOrderTransition): Promise<AdminOrder> {
    const raw = read<BackendOrder>(
      await apiClient.patch(`/admin/orders/${encodeURIComponent(id)}/status`, { status }),
    );
    return mapOrder(raw);
  },

  async getCustomers(search = '', page = 1): Promise<AdminPage<AdminCustomer>> {
    return read<AdminPage<AdminCustomer>>(
      await apiClient.get(`/admin/customers${query(page, 25, search)}`),
    );
  },

  async getCustomer(id: string): Promise<AdminCustomerDetail> {
    return read<AdminCustomerDetail>(
      await apiClient.get(`/admin/customers/${encodeURIComponent(id)}`),
    );
  },

  async getInventory(filter = 'all', page = 1, limit = 25, search = ''): Promise<AdminPage<InventoryItem>> {
    return read<AdminPage<InventoryItem>>(
      await apiClient.get(
        `/admin/inventory?filter=${encodeURIComponent(filter)}&page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`,
      ),
    );
  },

  async updateVariantStock(variantId: string, stock: number): Promise<unknown> {
    return read<unknown>(
      await apiClient.patch(`/admin/inventory/${encodeURIComponent(variantId)}`, { stock }),
    );
  },

  async listCategories(): Promise<AdminCategory[]> {
    return read<AdminCategory[]>(await apiClient.get('/admin/categories'));
  },

  async createCategory(
    value: Pick<AdminCategory, 'name' | 'slug'> & { description?: string; isActive?: boolean },
  ): Promise<AdminCategory> {
    return read<AdminCategory>(await apiClient.post('/admin/categories', value));
  },

  async updateCategory(
    id: string,
    value: Partial<Pick<AdminCategory, 'name' | 'slug' | 'description' | 'isActive'>>,
  ): Promise<AdminCategory> {
    return read<AdminCategory>(
      await apiClient.patch(`/admin/categories/${encodeURIComponent(id)}`, value),
    );
  },

  async listVariants(search = '', page = 1): Promise<AdminPage<AdminVariant>> {
    return read<AdminPage<AdminVariant>>(
      await apiClient.get(`/admin/variants${query(page, 25, search)}`),
    );
  },

  async listMovements(page = 1): Promise<AdminPage<InventoryMovement>> {
    return read<AdminPage<InventoryMovement>>(
      await apiClient.get(`/admin/inventory/movements${query(page)}`),
    );
  },

  async listReservations(page = 1): Promise<AdminPage<InventoryReservation>> {
    return read<AdminPage<InventoryReservation>>(
      await apiClient.get(`/admin/inventory/reservations${query(page)}`),
    );
  },

  async listCoupons(): Promise<AdminCoupon[]> {
    return read<AdminCoupon[]>(await apiClient.get('/admin/coupons'));
  },

  async createCoupon(value: Omit<AdminCoupon, 'id'>): Promise<AdminCoupon> {
    return read<AdminCoupon>(await apiClient.post('/admin/coupons', value));
  },

  async updateCoupon(id: string, value: Partial<Omit<AdminCoupon, 'id'>>): Promise<AdminCoupon> {
    return read<AdminCoupon>(
      await apiClient.patch(`/admin/coupons/${encodeURIComponent(id)}`, value),
    );
  },

  async listAuditLogs(page = 1): Promise<AdminPage<AuditLog>> {
    return read<AdminPage<AuditLog>>(await apiClient.get(`/admin/audit-logs${query(page)}`));
  },
};
