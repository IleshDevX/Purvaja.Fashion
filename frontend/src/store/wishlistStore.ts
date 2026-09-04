import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
  storage: createJSONStorage(() => localStorage),
  partialize: state => ({ savedItemIds: state.savedItemIds }),
}));
