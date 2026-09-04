import { describe, expect, it } from 'vitest';
import { calculateOrderPricing } from './pricing.js';

const items = [{
  id: 'item-1', shirtId: 'shirt-1', variantId: 'variant-1', name: 'Oxford Shirt', slug: 'oxford-shirt', image: '/images/products/oxford.jpg',
  price: 2400, compareAtPrice: 3000, color: { name: 'White', hex: '#FFFFFF' }, size: '40 (M)' as const, quantity: 1,
}];

describe('calculateOrderPricing', () => {
  it('does not trust client coupon values when displaying a preliminary total', () => {
    const pricing = calculateOrderPricing(items, 'standard', { code: 'SAVE90', percentOff: 90, description: 'forged' });

    expect(pricing.couponDiscount).toBe(0);
    expect(pricing.grandTotal).toBe(2599);
  });
});
