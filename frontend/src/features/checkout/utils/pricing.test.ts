import { describe, expect, it } from 'vitest';
import { calculateOrderPricing, FREE_SHIPPING_THRESHOLD } from './pricing.js';

const items = [
  {
    id: 'item-1',
    shirtId: 'shirt-1',
    variantId: 'variant-1',
    name: 'Oxford Shirt',
    slug: 'oxford-shirt',
    image: '/images/products/oxford.jpg',
    pricePaise: 240000,
    compareAtPricePaise: 300000,
    price: 2400,
    compareAtPrice: 3000,
    color: { name: 'White', hex: '#FFFFFF' },
    size: '40 (M)' as const,
    quantity: 1,
  },
];

describe('calculateOrderPricing', () => {
  it('calculates subtotal and applies standard delivery fee when subtotal is below threshold', () => {
    const pricing = calculateOrderPricing(items, 'standard');

    expect(pricing.subtotal).toBe(2400);
    expect(pricing.deliveryFee).toBe(199);
    expect(pricing.productSavings).toBe(600);
    expect(pricing.isFreeShipping).toBe(false);
    expect(pricing.remainingForFreeShipping).toBe(FREE_SHIPPING_THRESHOLD - 2400);
    expect(pricing.grandTotal).toBe(2599);
  });

  it('provides free standard shipping when subtotal meets free shipping threshold', () => {
    const qualifyingItems = [
      {
        ...items[0],
        pricePaise: 260000,
        price: 2600,
      },
    ];
    const pricing = calculateOrderPricing(qualifyingItems, 'standard');

    expect(pricing.subtotal).toBe(2600);
    expect(pricing.deliveryFee).toBe(0);
    expect(pricing.isFreeShipping).toBe(true);
    expect(pricing.remainingForFreeShipping).toBe(0);
    expect(pricing.grandTotal).toBe(2600);
  });

  it('calculates coupon percent discount properly', () => {
    const pricing = calculateOrderPricing(items, 'standard', {
      code: 'WELCOME10',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minimumOrderPaise: null,
      maximumDiscountPaise: null,
      description: '10% Welcome Discount',
    });

    // 10% of 2400 = 240
    expect(pricing.couponDiscount).toBe(240);
    // grandTotal = 2400 - 240 + 199 (delivery) = 2359
    expect(pricing.grandTotal).toBe(2359);
  });

  it('caps coupon discount at subtotal to prevent negative prices', () => {
    const pricing = calculateOrderPricing(items, 'standard', {
      code: 'MEGA5000',
      discountType: 'FIXED',
      discountValue: 500000,
      minimumOrderPaise: null,
      maximumDiscountPaise: null,
      description: 'Mega Discount',
    });

    expect(pricing.couponDiscount).toBe(2400);
    expect(pricing.grandTotal).toBe(199); // Only delivery fee remains
  });

  it('applies express shipping price regardless of subtotal', () => {
    const highValueItems = [{ ...items[0], pricePaise: 500000, price: 5000 }];
    const pricing = calculateOrderPricing(highValueItems, 'express');

    expect(pricing.deliveryFee).toBe(299);
    expect(pricing.grandTotal).toBe(5299);
  });

  it('keeps fractional rupee totals exact in integer paise', () => {
    const fractionalItems = [{
      ...items[0],
      pricePaise: 10049,
      price: 100.49,
      compareAtPricePaise: 12000,
      compareAtPrice: 120,
      quantity: 3,
    }];
    const pricing = calculateOrderPricing(fractionalItems, 'express', {
      code: 'ONEPAISE',
      discountType: 'FIXED',
      discountValue: 1,
      minimumOrderPaise: null,
      maximumDiscountPaise: null,
      description: 'One paise exact discount',
    });

    expect(pricing.subtotalPaise).toBe(30147);
    expect(pricing.productSavingsPaise).toBe(5853);
    expect(pricing.couponDiscountPaise).toBe(1);
    expect(pricing.deliveryFeePaise).toBe(29900);
    expect(pricing.grandTotalPaise).toBe(60046);
    expect(pricing.grandTotal).toBe(600.46);
  });

  it('recalculates fixed discounts and minimum eligibility from current cart inputs', () => {
    const coupon = {
      code: 'FIXED500', discountType: 'FIXED' as const, discountValue: 50000,
      minimumOrderPaise: 200000, maximumDiscountPaise: null, description: '₹500 off',
    };
    expect(calculateOrderPricing(items, 'standard', coupon).couponDiscountPaise).toBe(50000);
    const smallerCart = [{ ...items[0], pricePaise: 100000, price: 1000 }];
    const recalculated = calculateOrderPricing(smallerCart, 'standard', coupon);
    expect(recalculated.couponDiscountPaise).toBe(0);
    expect(recalculated.couponEligibilityError).toContain('₹2,000');
  });
});
