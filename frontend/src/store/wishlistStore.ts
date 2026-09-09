import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useAuthStore } from '../features/auth/store/authStore.js';

interface WishlistState {
  savedItemIds: string[];
  toggleWishlist: (shirtId: string) => boolean;
  isInWishlist: (shirtId: string) => boolean;
  removeFromWishlist: (shirtId: string) => void;
  clearWishlist: () => void;
  getItemCount: () => number;
}

export const useWishlistStore = create<WishlistState>()(persist((set, get) => ({
  savedItemIds: [],

  toggleWishlist: (shirtId: string) => {
    const isCurrentlySaved = get().savedItemIds.includes(shirtId);
    if (isCurrentlySaved) {
      set(state => ({
        savedItemIds: state.savedItemIds.filter(id => id !== shirtId),
      }));
      return false;
    } else {
      set(state => ({
        savedItemIds: [...state.savedItemIds, shirtId],
      }));
      return true;
    }
  },

  isInWishlist: (shirtId: string) => {
    return get().savedItemIds.includes(shirtId);
  },

  removeFromWishlist: (shirtId: string) => {
    set(state => ({
      savedItemIds: state.savedItemIds.filter(id => id !== shirtId),
    }));
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
    // Rewrite persisted guest state so account-owned selections are memory-only.
    useWishlistStore.setState({ savedItemIds: useWishlistStore.getState().savedItemIds });
  }
});
