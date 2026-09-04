import { beforeEach, describe, expect, it } from 'vitest';
import { useCartStore } from './cartStore.js';

const item = {
  shirtId: 'shirt-1', variantId: 'variant-1', name: 'Oxford Shirt', slug: 'oxford-shirt', image: '/images/products/oxford.jpg', price: 2499,
  color: { name: 'White', hex: '#FFFFFF' }, size: '40 (M)' as const, quantity: 1,
};

describe('cart store', () => {
  beforeEach(() => useCartStore.setState({ items: [], isDrawerOpen: false }));

  it('merges identical variants and preserves the correct quantity', () => {
    useCartStore.getState().addItem(item);
    useCartStore.getState().addItem(item);

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().getItemCount()).toBe(2);
  });
});
