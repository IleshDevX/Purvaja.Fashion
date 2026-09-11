import { beforeEach, describe, expect, it } from 'vitest';
import { useCartStore } from './cartStore.js';
import { useAuthStore } from '../features/auth/store/authStore.js';

const item = {
  shirtId: 'shirt-1', variantId: 'variant-1', name: 'Oxford Shirt', slug: 'oxford-shirt', image: '/images/products/oxford.jpg', pricePaise: 249900, price: 2499,
  color: { name: 'White', hex: '#FFFFFF' }, size: '40 (M)' as const, quantity: 1,
  stockQuantity: 5,
};

describe('cart store', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'guest', user: null });
    useCartStore.setState({ items: [], ownerId: null, guestMergeId: null, isDrawerOpen: false });
  });

  it('merges identical variants and preserves the correct quantity', async () => {
    await useCartStore.getState().addItem(item);
    await useCartStore.getState().addItem(item);

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().getItemCount()).toBe(2);
  });

  it('rejects guest mutations without an authoritative inventory snapshot', async () => {
    const invalid = { ...item } as Partial<typeof item>;
    delete invalid.stockQuantity;
    await expect(useCartStore.getState().addItem(invalid as typeof item)).rejects.toThrow('Current inventory is required');
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
