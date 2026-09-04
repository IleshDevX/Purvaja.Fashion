export interface InventoryItem {
  id: string;
  shirtId: string;
  shirtName: string;
  slug: string;
  sku: string;
  color: string;
  size: string;
  stock: number;
  lowStockThreshold: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lastUpdated: string;
}

export interface AdminDashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  shirtsSold: number;
  activeCustomers: number;
  pendingOrders: number;
  lowStockCount: number;
}

export interface AdminSalesPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface AdminStoreSettings {
  storeName: string;
  supportEmail: string;
  currency: string;
  lowStockThreshold: number;
  defaultFit: string;
  enableLiveAlterations: boolean;
  orderDispatchWindowHours: number;
}

export interface AdminCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  tier: 'Patron' | 'Atelier Member' | 'VIP Connoisseur';
  ordersCount: number;
  totalSpend: number;
  preferredFit: 'Slim' | 'Regular' | 'Relaxed';
  joinedDate: string;
  status: 'active' | 'inactive';
}
