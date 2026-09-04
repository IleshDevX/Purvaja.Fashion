import { describe, expect, it } from 'vitest';
import { productFormSchema } from './productFormSchema.js';

const validProduct = {
  name: 'Artisan Oxford Shirt',
  slug: 'artisan-oxford-shirt',
  tagline: 'A precise everyday staple',
  description: 'A tailored Oxford shirt crafted for dependable everyday wear.',
  price: 2999,
  fit: 'Slim',
  fabric: 'Oxford Cotton',
  collar: 'Spread Collar',
  sleeve: 'Full Sleeve',
  pattern: 'Solid',
  images: ['/images/products/artisan-oxford.jpg'],
  variants: [{
    id: 'variant-1', color: { name: 'White', hex: '#FFFFFF' }, size: '40 (M)', sku: 'PUR-OXF-WHT-40', stockCount: 10, inStock: true,
  }],
};

describe('productFormSchema', () => {
  it('accepts site-relative product image paths', () => {
    expect(productFormSchema.safeParse(validProduct).success).toBe(true);
  });

  it('rejects insecure or malformed image URLs', () => {
    expect(productFormSchema.safeParse({ ...validProduct, images: ['http://cdn.example.com/shirt.jpg'] }).success).toBe(false);
  });
});
