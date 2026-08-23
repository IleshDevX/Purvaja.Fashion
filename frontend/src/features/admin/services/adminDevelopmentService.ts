import { Shirt } from '../../products/types/product.js';
import { DEVELOPMENT_SHIRTS } from '../../products/data/shirts.js';
import { developmentOrderStore } from '../../orders/store/developmentOrderStore.js';
import { Order } from '../../orders/types/order.js';
import { SYNTHETIC_CUSTOMERS, SyntheticCustomer } from '../data/syntheticCustomers.js';
import { InventoryItem } from '../types/admin.js';

export interface AdminDashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  shirtsSold: number;
  activeCustomers: number;
  pendingOrders: number;
  lowStockCount: number;
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

const DEFAULT_SETTINGS: AdminStoreSettings = {
  storeName: 'PURVAJA Menswear Atelier',
  supportEmail: 'concierge@purvajafashion.com',
  currency: 'INR (₹)',
  lowStockThreshold: 10,
  defaultFit: 'Slim',
  enableLiveAlterations: true,
  orderDispatchWindowHours: 24,
};

let currentSettings: AdminStoreSettings = { ...DEFAULT_SETTINGS };
let customersState: SyntheticCustomer[] = [...SYNTHETIC_CUSTOMERS];

export const adminDevelopmentService = {
  async getDashboardMetrics(): Promise<AdminDashboardMetrics> {
    const orders = await developmentOrderStore.getOrders();
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, ord) => sum + (ord.status !== 'cancelled' ? ord.grandTotal : 0), 0);
    const shirtsSold = orders.reduce(
      (sum, ord) => sum + (ord.status !== 'cancelled' ? ord.items.reduce((iSum, item) => iSum + item.quantity, 0) : 0),
      0,
    );
    const pendingOrders = orders.filter(
      ord => ord.status === 'confirmed' || ord.status === 'processing',
    ).length;

    let lowStockCount = 0;
    DEVELOPMENT_SHIRTS.forEach(shirt => {
      shirt.variants.forEach(variant => {
        if ((variant.stockCount ?? 0) <= currentSettings.lowStockThreshold) {
          lowStockCount++;
        }
      });
    });

    return {
      totalRevenue: totalRevenue > 0 ? totalRevenue : 348900,
      totalOrders: totalOrders > 0 ? totalOrders : 142,
      shirtsSold: shirtsSold > 0 ? shirtsSold : 386,
      activeCustomers: customersState.length,
      pendingOrders: pendingOrders > 0 ? pendingOrders : 8,
      lowStockCount: lowStockCount > 0 ? lowStockCount : 3,
    };
  },

  async getSalesChartData(timeframe: 'daily' | 'weekly' | 'monthly'): Promise<{ label: string; revenue: number; orders: number }[]> {
    if (timeframe === 'daily') {
      return [
        { label: 'Mon', revenue: 38400, orders: 12 },
        { label: 'Tue', revenue: 45200, orders: 15 },
        { label: 'Wed', revenue: 52900, orders: 18 },
        { label: 'Thu', revenue: 48100, orders: 16 },
        { label: 'Fri', revenue: 64500, orders: 22 },
        { label: 'Sat', revenue: 78900, orders: 28 },
        { label: 'Sun', revenue: 69200, orders: 24 },
      ];
    }
    if (timeframe === 'weekly') {
      return [
        { label: 'Week 1', revenue: 210000, orders: 74 },
        { label: 'Week 2', revenue: 245000, orders: 86 },
        { label: 'Week 3', revenue: 290000, orders: 104 },
        { label: 'Week 4', revenue: 315000, orders: 112 },
      ];
    }
    return [
      { label: 'Nov', revenue: 840000, orders: 290 },
      { label: 'Dec', revenue: 1120000, orders: 395 },
      { label: 'Jan', revenue: 980000, orders: 340 },
      { label: 'Feb', revenue: 1050000, orders: 368 },
      { label: 'Mar', revenue: 1240000, orders: 432 },
    ];
  },

  async getCustomers(searchQuery = ''): Promise<SyntheticCustomer[]> {
    if (!searchQuery.trim()) return [...customersState];
    const q = searchQuery.toLowerCase();
    return customersState.filter(
      c =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q),
    );
  },

  async getCustomerById(id: string): Promise<SyntheticCustomer | null> {
    return customersState.find(c => c.id === id) || null;
  },

  async getInventory(filter: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' = 'all'): Promise<InventoryItem[]> {
    const items: InventoryItem[] = [];
    DEVELOPMENT_SHIRTS.forEach(shirt => {
      shirt.variants.forEach(variant => {
        const stock = variant.stockCount ?? 0;
        let status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
        if (stock <= 0) status = 'out_of_stock';
        else if (stock <= currentSettings.lowStockThreshold) status = 'low_stock';

        items.push({
          id: variant.id,
          shirtId: shirt.id,
          shirtName: shirt.name,
          slug: shirt.slug,
          sku: variant.sku,
          color: variant.color.name,
          size: variant.size,
          stock,
          lowStockThreshold: currentSettings.lowStockThreshold,
          status,
          lastUpdated: new Date().toISOString().split('T')[0] ?? '2026-08-23',
        });
      });
    });

    if (filter === 'all') return items;
    return items.filter(item => item.status === filter);
  },

  async updateVariantStock(variantId: string, newStock: number): Promise<{ success: boolean; message: string }> {
    let found = false;
    DEVELOPMENT_SHIRTS.forEach(shirt => {
      const v = shirt.variants.find(item => item.id === variantId);
      if (v) {
        v.stockCount = Math.max(0, newStock);
        v.inStock = v.stockCount > 0;
        found = true;
      }
    });

    if (found) {
      return { success: true, message: `Updated stock level to ${newStock} units.` };
    }
    return { success: false, message: 'Variant not found in catalog.' };
  },

  async getSettings(): Promise<AdminStoreSettings> {
    return { ...currentSettings };
  },

  async updateSettings(newSettings: Partial<AdminStoreSettings>): Promise<AdminStoreSettings> {
    currentSettings = { ...currentSettings, ...newSettings };
    return { ...currentSettings };
  },
};
