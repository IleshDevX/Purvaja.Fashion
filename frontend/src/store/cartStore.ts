import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ShirtColor, ShirtSize } from '../features/products/types/product.js';

export interface CartItem {
  id: string;
  shirtId: string;
  variantId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  compareAtPrice?: number;
  color: ShirtColor;
  size: ShirtSize;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  getTotalSavings: () => number;
}

export const useCartStore = create<CartState>()(persist((set, get) => ({
  items: [],
  isDrawerOpen: false,

  setDrawerOpen: (open: boolean) => set({ isDrawerOpen: open }),

  addItem: (item: Omit<CartItem, 'id'>) => {
    const id = `${item.shirtId}-${item.variantId}`;
    set(state => {
      const existingIndex = state.items.findIndex(i => i.id === id);
      const existingItem = state.items[existingIndex];
      if (existingIndex > -1 && existingItem) {
        const updated = [...state.items];
        updated[existingIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + item.quantity,
        };
        return { items: updated, isDrawerOpen: true };
      }
      return { items: [...state.items, { ...item, id }], isDrawerOpen: true };
    });
  },

  removeItem: (id: string) => {
    set(state => ({
      items: state.items.filter(i => i.id !== id),
    }));
  },

  updateQuantity: (id: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(id);
      return;
    }
    set(state => ({
      items: state.items.map(i => (i.id === id ? { ...i, quantity } : i)),
    }));
  },

  clearCart: () => set({ items: [] }),

  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + Math.round(item.price) * item.quantity, 0);
  },

  getTotalSavings: () => {
    return get().items.reduce((sum, item) => {
      if (item.compareAtPrice && item.compareAtPrice > item.price) {
        return sum + Math.round(item.compareAtPrice - item.price) * item.quantity;
      }
      return sum;
    }, 0);
  },
}), {
  name: 'purvaja-cart-v2',
  storage: createJSONStorage(() => localStorage),
  partialize: state => ({ items: state.items }),
}));
