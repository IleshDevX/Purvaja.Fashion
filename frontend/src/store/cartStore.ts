import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ShirtColor, ShirtSize } from '../features/products/types/product.js';
import { cartService } from '../services/api/cartService.js';
import { useAuthStore } from '../features/auth/store/authStore.js';

export interface CartItem {
  id: string; shirtId: string; variantId: string; name: string; slug: string; image: string;
  pricePaise: number; compareAtPricePaise?: number;
  price: number; compareAtPrice?: number; color: ShirtColor; size: ShirtSize;
  quantity: number; stockQuantity?: number;
}
interface CartState {
  items: CartItem[];
  ownerId: string | null;
  guestMergeId: string | null;
  isDrawerOpen: boolean;
  isSyncing: boolean;
  error: string | null;
  setDrawerOpen: (open: boolean) => void;
  addItem: (item: Omit<CartItem, 'id' | 'stockQuantity'> & { stockQuantity: number }) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  syncWithServer: () => Promise<void>;
  getItemCount: () => number;
  getSubtotalPaise: () => number;
  getSubtotal: () => number;
  getTotalSavingsPaise: () => number;
  getTotalSavings: () => number;
}
const authenticatedOwner = () => {
  const auth = useAuthStore.getState();
  return auth.status === 'authenticated' ? auth.user?.id ?? null : null;
};
let sessionGeneration = 0;
let pendingOperation: Promise<unknown> = Promise.resolve();

export const useCartStore = create<CartState>()(persist((set, get) => {
  // Serialize browser operations and fence results by session generation.
  // Durable server merge IDs also protect retries across reloads and tabs.
  const serverOperation = (operation?: () => Promise<CartItem[]>, openDrawer = false): Promise<void> => {
    const owner = authenticatedOwner();
    const generation = sessionGeneration;
    if (!owner) return Promise.resolve();
    const current = () => authenticatedOwner() === owner && sessionGeneration === generation;
    const work = pendingOperation.catch(() => undefined).then(async () => {
      if (!current()) return;
      set({ isSyncing: true, error: null });
      try {
        let items: CartItem[];
        if (get().ownerId === null && get().items.length) {
          const mergeId = get().guestMergeId ?? crypto.randomUUID();
          set({ guestMergeId: mergeId });
          items = await cartService.mergeGuestItems(get().items, mergeId);
        } else {
          items = await cartService.getCart();
        }
        if (!current()) return;
        set({ items, ownerId: owner, guestMergeId: null });
        if (operation) items = await operation();
        if (!current()) return;
        set({ items, isSyncing: false, ...(openDrawer ? { isDrawerOpen: true } : {}) });
      } catch (error) {
        if (current() && get().ownerId === owner) {
          try {
            const items = await cartService.getCart();
            if (current()) set({ items });
          } catch { /* Retain the last known server state and report failure. */ }
        }
        if (current()) set({ isSyncing: false, error: error instanceof Error ? error.message : 'Unable to synchronize your bag.' });
        throw error;
      }
    });
    pendingOperation = work;
    return work;
  };
  const guestItems = (items: CartItem[]) => set({ items, ownerId: null, guestMergeId: crypto.randomUUID(), error: null });
  return {
    items: [], ownerId: null, guestMergeId: null, isDrawerOpen: false, isSyncing: false, error: null,
    setDrawerOpen: open => set({ isDrawerOpen: open }),
    addItem: async item => {
      if (authenticatedOwner()) return serverOperation(() => cartService.addCartItem(item.variantId, item.quantity), true);
      if (useAuthStore.getState().status === 'loading') throw new Error('Please wait while your session loads.');
      if (!Number.isInteger(item.stockQuantity) || item.stockQuantity < 0) {
        throw new Error('Current inventory is required before adding this item.');
      }
      if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw new Error('Quantity must be a positive whole number.');
      const existing = get().items.find(entry => entry.variantId === item.variantId);
      const quantity = (existing?.quantity ?? 0) + item.quantity;
      const maxAllowed = Math.min(item.stockQuantity, 20);
      if (quantity > maxAllowed) throw new Error('Requested quantity is unavailable.');
      guestItems(existing
        ? get().items.map(entry => entry.variantId === item.variantId ? { ...entry, quantity, stockQuantity: item.stockQuantity } : entry)
        : [...get().items, { ...item, id: item.shirtId + '-' + item.variantId, stockQuantity: item.stockQuantity }]);
      set({ isDrawerOpen: true });
    },
    removeItem: async id => {
      if (authenticatedOwner()) return serverOperation(() => cartService.removeCartItem(id));
      guestItems(get().items.filter(item => item.id !== id && item.variantId !== id));
    },
    updateQuantity: async (id, quantity) => {
      if (quantity <= 0) return get().removeItem(id);
      if (authenticatedOwner()) return serverOperation(() => cartService.updateCartItem(id, quantity));
      const item = get().items.find(entry => entry.id === id || entry.variantId === id);
      if (!item || !Number.isInteger(item.stockQuantity) || !Number.isInteger(quantity) || quantity > Math.min(item.stockQuantity!, 20)) throw new Error('Requested quantity is unavailable.');
      guestItems(get().items.map(entry => entry === item ? { ...entry, quantity } : entry));
    },
    clearCart: async () => {
      if (authenticatedOwner()) return serverOperation(async () => { await cartService.clearCart(); return []; });
      guestItems([]);
    },
    syncWithServer: () => serverOperation(),
    getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    getSubtotalPaise: () => get().items.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0),
    getSubtotal: () => get().getSubtotalPaise() / 100,
    getTotalSavingsPaise: () => get().items.reduce((sum, item) => sum + Math.max(0, (item.compareAtPricePaise ?? item.pricePaise) - item.pricePaise) * item.quantity, 0),
    getTotalSavings: () => get().getTotalSavingsPaise() / 100,
  };
}, {
  name: 'purvaja-cart-v2',
  version: 4,
  storage: createJSONStorage(() => localStorage),
  // Legacy snapshots mix server data and guest additions with no provenance.
  // Never replay ambiguous data into an authenticated cart.
  migrate: (persisted, version) => {
    const value = persisted as Partial<CartState> | undefined;
    const items = version === 3 && value?.ownerId === null && Array.isArray(value.items)
      ? value.items.filter(item => Number.isSafeInteger(item.stockQuantity) && item.stockQuantity! >= 0 &&
          Number.isSafeInteger(item.quantity) && item.quantity > 0 && item.quantity <= Math.min(item.stockQuantity!, 20) &&
          Number.isSafeInteger(item.pricePaise) && item.pricePaise >= 0)
      : [];
    return { items, ownerId: null, guestMergeId: items.length ? value?.guestMergeId ?? crypto.randomUUID() : null };
  },
  partialize: state => ({ items: state.ownerId === null ? state.items : [], guestMergeId: state.ownerId === null ? state.guestMergeId : null, ownerId: null }),
}));

useAuthStore.subscribe((state, previous) => {
  if (state.user?.id === previous.user?.id && state.status === previous.status) return;
  sessionGeneration++;
  pendingOperation = Promise.resolve();
  if (previous.user && state.user?.id !== previous.user.id) {
    useCartStore.setState({ items: [], ownerId: null, guestMergeId: null, isSyncing: false, isDrawerOpen: false, error: null });
  }
  if (state.status === 'authenticated') void useCartStore.getState().syncWithServer().catch(() => undefined);
});
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    if (authenticatedOwner()) void useCartStore.getState().syncWithServer().catch(() => undefined);
  });
}
