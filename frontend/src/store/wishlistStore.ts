import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStore } from '../features/auth/store/authStore.js';
import { apiClient, unwrapApiData } from '../services/api/client.js';

interface WishlistState {
  savedItemIds: string[];
  toggleWishlist: (shirtId: string) => boolean;
  isInWishlist: (shirtId: string) => boolean;
  removeFromWishlist: (shirtId: string) => void;
  clearWishlist: () => void;
  getItemCount: () => number;
  fetchWishlist: () => Promise<void>;
}

export const useWishlistStore = create<WishlistState>()(persist((set, get) => ({
  savedItemIds: [],

  fetchWishlist: async () => {
    if (useAuthStore.getState().status !== 'authenticated') return;
    try {
      const response = await apiClient.get('/wishlist');
      const data = unwrapApiData<{ items: string[] }>(response.data);
      if (Array.isArray(data?.items)) {
        set({ savedItemIds: data.items });
      }
    } catch {
      // Fall back to local state if offline or network error
    }
  },

  toggleWishlist: (shirtId: string) => {
    const isCurrentlySaved = get().savedItemIds.includes(shirtId);
    const nextSaved = isCurrentlySaved
      ? get().savedItemIds.filter(id => id !== shirtId)
      : [...get().savedItemIds, shirtId];

    // Optimistic local update
    set({ savedItemIds: nextSaved });

    if (useAuthStore.getState().status === 'authenticated') {
      const syncPromise = isCurrentlySaved
        ? apiClient.delete(`/wishlist/${encodeURIComponent(shirtId)}`)
        : apiClient.post('/wishlist', { productId: shirtId });

      syncPromise
        .then(response => {
          const data = unwrapApiData<{ items: string[] }>(response.data);
          if (Array.isArray(data?.items)) set({ savedItemIds: data.items });
        })
        .catch(() => {
          // Rollback on network failure
          set({ savedItemIds: get().savedItemIds });
        });
    }

    return !isCurrentlySaved;
  },

  isInWishlist: (shirtId: string) => {
    return get().savedItemIds.includes(shirtId);
  },

  removeFromWishlist: (shirtId: string) => {
    const nextSaved = get().savedItemIds.filter(id => id !== shirtId);
    set({ savedItemIds: nextSaved });

    if (useAuthStore.getState().status === 'authenticated') {
      apiClient.delete(`/wishlist/${encodeURIComponent(shirtId)}`)
        .then(response => {
          const data = unwrapApiData<{ items: string[] }>(response.data);
          if (Array.isArray(data?.items)) set({ savedItemIds: data.items });
        })
        .catch(() => {
          // Suppress quietly
        });
    }
  },

  clearWishlist: () => set({ savedItemIds: [] }),

  getItemCount: () => get().savedItemIds.length,
}), {
  name: 'purvaja-wishlist-v2',
  version: 1,
  migrate: () => ({ savedItemIds: [] }),
  storage: createJSONStorage(() => localStorage),
  partialize: state => ({ savedItemIds: useAuthStore.getState().status === 'guest' ? state.savedItemIds : [] }),
}));

useAuthStore.subscribe((state, previous) => {
  if (previous.user && (state.user?.id !== previous.user.id || state.status !== 'authenticated')) {
    useWishlistStore.getState().clearWishlist();
  } else if (state.status === 'authenticated' && previous.status !== 'authenticated') {
    const localGuestIds = useWishlistStore.getState().savedItemIds;
    if (localGuestIds.length > 0) {
      // Synchronize guest items into account on login
      apiClient.post('/wishlist/sync', { productIds: localGuestIds })
        .then(response => {
          const data = unwrapApiData<{ items: string[] }>(response.data);
          if (Array.isArray(data?.items)) {
            useWishlistStore.setState({ savedItemIds: data.items });
          }
        })
        .catch(() => {
          void useWishlistStore.getState().fetchWishlist();
        });
    } else {
      void useWishlistStore.getState().fetchWishlist();
    }
  }
});
