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
