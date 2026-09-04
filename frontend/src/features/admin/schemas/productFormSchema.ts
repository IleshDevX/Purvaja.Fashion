import { z } from 'zod';
import {
  ShirtFit,
  ShirtFabric,
  ShirtCollar,
  ShirtSleeve,
  ShirtPattern,
  ShirtSize,
} from '../../products/types/product.js';

export const FITS: ShirtFit[] = ['Slim', 'Regular', 'Relaxed'];
export const FABRICS: ShirtFabric[] = [
  '100% Egyptian Cotton',
  'Pure Linen',
  'Oxford Cotton',
  'Cotton Poplin',
  'Denim',
  'Linen Blend',
];
export const COLLARS: ShirtCollar[] = [
  'Spread Collar',
  'Button-Down Collar',
  'Mandarin Collar',
  'Cuban Collar',
  'Cutaway Collar',
];
export const SLEEVES: ShirtSleeve[] = ['Full Sleeve', 'Half Sleeve'];
export const PATTERNS: ShirtPattern[] = ['Solid', 'Striped', 'Checked', 'Textured'];
export const SIZES: ShirtSize[] = ['38 (S)', '39 (M)', '40 (M)', '42 (L)', '44 (XL)', '46 (XXL)'];

const imagePathSchema = z.string().min(1, 'Product image is required').refine(
  value => value.startsWith('/') || /^https:\/\/.+/i.test(value),
  'Use a site-relative path or an HTTPS image URL',
);

export const variantSchema = z.object({
  id: z.string().min(1, 'Variant ID is required'),
  color: z.object({
    name: z.string().min(1, 'Color name is required'),
    hex: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color code'),
  }),
  size: z.enum(['38 (S)', '39 (M)', '40 (M)', '42 (L)', '44 (XL)', '46 (XXL)']),
  sku: z.string().min(3, 'SKU must be at least 3 characters'),
  stockCount: z.number().int('Stock must be an integer').min(0, 'Stock cannot be negative'),
  inStock: z.boolean(),
});

export const productFormSchema = z
  .object({
    name: z.string().min(3, 'Shirt name must be at least 3 characters'),
    slug: z
      .string()
      .min(3, 'Slug must be at least 3 characters')
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Slug must contain only lowercase letters, numbers, and hyphens',
      ),
    tagline: z.string().min(5, 'Tagline must be at least 5 characters'),
    description: z.string().min(15, 'Description must be at least 15 characters'),
    price: z.number().positive('Price must be greater than 0'),
    compareAtPrice: z.number().optional(),
    fit: z.enum(['Slim', 'Regular', 'Relaxed']),
    fabric: z.enum([
      '100% Egyptian Cotton',
      'Pure Linen',
      'Oxford Cotton',
      'Cotton Poplin',
      'Denim',
      'Linen Blend',
    ]),
    collar: z.enum([
      'Spread Collar',
      'Button-Down Collar',
      'Mandarin Collar',
      'Cuban Collar',
      'Cutaway Collar',
    ]),
    sleeve: z.enum(['Full Sleeve', 'Half Sleeve']),
    pattern: z.enum(['Solid', 'Striped', 'Checked', 'Textured']),
    isNewArrival: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
    isDeal: z.boolean().default(false),
    images: z.array(imagePathSchema).min(1, 'At least one product image is required'),
    variants: z.array(variantSchema).min(1, 'At least one variant must be specified'),
  })
  .refine(
    data => {
      if (data.compareAtPrice !== undefined && data.compareAtPrice > 0) {
        return data.compareAtPrice >= data.price;
      }
      return true;
    },
    {
      message:
        'Original price (compare-at price) must be greater than or equal to the selling price',
      path: ['compareAtPrice'],
    },
  )
  .refine(
    data => {
      const keys = new Set<string>();
      for (const v of data.variants) {
        const key = `${v.color.name.toLowerCase()}__${v.size}`;
        if (keys.has(key)) {
          return false;
        }
        keys.add(key);
      }
      return true;
    },
    {
      message: 'Duplicate variant combinations (same color and size) are not allowed',
      path: ['variants'],
    },
  );

export type ProductFormValues = z.infer<typeof productFormSchema>;
export type VariantFormValues = z.infer<typeof variantSchema>;
