export interface AdminPage<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AdminProductVariant {
  id: string;
  productId?: string;
  sku: string;
  size: string;
  colorName: string;
  colorHex: string;
  priceOverridePaise: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  status: 'ACTIVE' | 'DISCONTINUED';
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminProductImage {
  id: string;
  productId?: string;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
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
  categories: AdminCategory[];
  variants: AdminProductVariant[];
  images: AdminProductImage[];
}

export interface AdminProductInput {
  name: string;
  slug: string;
  description: string;
  basePricePaise: number;
  status?: AdminProduct['status'];
  categoryIds?: string[];
}

export interface AdminShippingAddress {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  country: string;
}

export interface AdminPayment {
  id: string;
  orderId?: string;
  provider: 'COD' | 'PHONEPE' | string;
  method: 'CASH_ON_DELIVERY' | 'UPI' | string;
  amountPaise: number;
  status: 'PENDING' | 'AUTHORIZED' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED' | string;
  providerReference?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderItem {
  id: string;
  orderId?: string;
  variantId?: string | null;
  productName: string;
  sku: string;
  size: string;
  colorName: string;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
  createdAt?: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  userId?: string;
  customer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    status?: string;
  };
  items: AdminOrderItem[];
  subtotalPaise: number;
  discountPaise: number;
  shippingChargePaise: number;
  taxPaise: number;
  totalPaise: number;
  shippingAddress: AdminShippingAddress;
  billingAddress?: AdminShippingAddress | null;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURN_REQUESTED' | 'RETURNED';
  paymentStatus: string;
  paymentProvider: 'COD' | 'PHONEPE' | string | null;
  payments: AdminPayment[];
  createdAt: string;
  updatedAt: string;
}

export type AdminOrderTransition = 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface AdminDashboardMetrics {
  totalProducts: number;
  totalCustomers: number;
  totalOrders: number;
  pendingPayments: number;
  confirmedOrders: number;
  processingOrders: number;
  lowStockVariants: number;
  outOfStockVariants: number;
  totalRevenue: number;
  shirtsSold: number;
  activeCustomers: number;
  pendingOrders: number;
  lowStockCount: number;
  recentOrders: AdminOrder[];
}

export interface AdminCustomer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  status: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  _count: { orders: number };
}

export interface AdminCustomerDetail extends AdminCustomer {
  orders: Array<Pick<AdminOrder, 'id' | 'orderNumber' | 'totalPaise' | 'status' | 'paymentStatus' | 'createdAt'>>;
}

export interface InventoryItem {
  id: string;
  shirtId: string;
  shirtName: string;
  slug: string;
  sku: string;
  color: string;
  size: string;
  stock: number;
  reservedStock: number;
  availableStock: number;
  lowStockThreshold: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lastUpdated: string;
}

export interface AdminVariant {
  id: string;
  productId: string;
  sku: string;
  size: string;
  colorName: string;
  colorHex: string;
  priceOverridePaise: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  status: string;
  updatedAt: string;
  product: { id: string; name: string; slug: string };
}

export interface InventoryMovement {
  id: string;
  type: string;
  quantity: number;
  previousQuantity: number;
  resultingQuantity: number;
  reason: string | null;
  referenceType: string | null;
  createdAt: string;
  variant: { sku: string; size: string; colorName: string; product: { name: string } };
}

export interface InventoryReservation {
  id: string;
  quantity: number;
  status: string;
  expiresAt: string;
  releasedAt: string | null;
  createdAt: string;
  order: { id: string; orderNumber: string };
  variant: { sku: string; size: string; colorName: string; product: { name: string } };
}

export interface AdminCoupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minimumOrderPaise: number | null;
  maximumDiscountPaise: number | null;
  usageLimit: number | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
  actor: { email: string; firstName: string | null; lastName: string | null } | null;
}
