import { apiClient, unwrapApiData } from './client.js';
import type { CartItem } from '../../store/cartStore.js';
import type { ShirtSize } from '../../features/products/types/product.js';

interface BackendCartItem {
  id: string;
  variantId: string;
  quantity: number;
  stockQuantity: number;
  sku: string;
  size: string;
  colorName: string;
  pricePaise: number;
  product: {
    id: string;
    name: string;
    slug: string;
    image: string | null;
  };
}

interface BackendCartResponse {
  id: string;
  items: BackendCartItem[];
}

export function mapBackendCartItemToCartItem(item: BackendCartItem): CartItem {
  return {
    id: item.id,
    shirtId: item.product.id,
    variantId: item.variantId,
    name: item.product.name,
    slug: item.product.slug,
    image: item.product.image || '/images/products/placeholder.jpg',
    pricePaise: item.pricePaise,
    price: item.pricePaise / 100,
    color: { name: item.colorName, hex: '#1E293B' },
    size: (item.size as ShirtSize) || '40 (M)',
    quantity: item.quantity,
    stockQuantity: item.stockQuantity,
  };
}

export const cartService = {
  async getCart(): Promise<CartItem[]> {
    const response = await apiClient.get('/cart');
    const data = unwrapApiData<BackendCartResponse>(response.data);
    return (data.items || []).map(mapBackendCartItemToCartItem);
  },

  async addCartItem(variantId: string, quantity: number): Promise<CartItem[]> {
    const response = await apiClient.post('/cart/items', { variantId, quantity });
    const data = unwrapApiData<BackendCartResponse>(response.data);
    return (data.items || []).map(mapBackendCartItemToCartItem);
  },

  async updateCartItem(itemId: string, quantity: number): Promise<CartItem[]> {
    const response = await apiClient.patch(`/cart/items/${encodeURIComponent(itemId)}`, { quantity });
    const data = unwrapApiData<BackendCartResponse>(response.data);
    return (data.items || []).map(mapBackendCartItemToCartItem);
  },

  async removeCartItem(itemId: string): Promise<CartItem[]> {
    const response = await apiClient.delete(`/cart/items/${encodeURIComponent(itemId)}`);
    const data = unwrapApiData<BackendCartResponse>(response.data);
    return (data.items || []).map(mapBackendCartItemToCartItem);
  },

  async clearCart(): Promise<void> {
    await apiClient.delete('/cart');
  },

  async mergeGuestItems(guestItems: CartItem[], mergeId: string): Promise<CartItem[]> {
    const response = await apiClient.post('/cart/merge', {
      mergeId,
      items: guestItems.map(({ variantId, quantity }) => ({ variantId, quantity })),
    });
    return unwrapApiData<BackendCartResponse>(response.data).items.map(mapBackendCartItemToCartItem);
  },
};
