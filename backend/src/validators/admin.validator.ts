import { z } from 'zod';
import { ValidationError } from '../utils/errors.js';
export const uuid = z.string().uuid();
export const pagination = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25), search: z.string().trim().max(120).optional() });
export const inventoryQuery = pagination.extend({ filter: z.enum(['all', 'in_stock', 'low_stock', 'out_of_stock']).default('all') });
const image = z.object({
  url: z.string().trim().min(1).max(2048).refine(value => /^\/(?![\\/])/.test(value) || /^https:\/\//i.test(value), 'Use a safe site-relative path or HTTPS URL.'),
  isPrimary: z.boolean(),
});
export const product = z.object({
  name: z.string().trim().min(2).max(255),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(255),
  tagline: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().min(10),
  brand: z.string().trim().min(1).max(120).optional(),
  basePricePaise: z.number().int().min(0),
  compareAtPricePaise: z.number().int().min(0).nullable().optional(),
  discountPercent: z.number().int().min(0).max(100).nullable().optional(),
  fit: z.enum(['Slim', 'Regular', 'Relaxed']).nullable().optional(),
  fabric: z.string().trim().max(120).nullable().optional(),
  collar: z.string().trim().max(120).nullable().optional(),
  sleeve: z.string().trim().max(80).nullable().optional(),
  pattern: z.string().trim().max(80).nullable().optional(),
  careInstructions: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  isFeatured: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isDeal: z.boolean().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  categoryIds: z.array(uuid).max(20).optional(),
  images: z.array(image).max(12).refine(items => items.length === 0 || items.filter(item => item.isPrimary).length === 1, 'Select exactly one primary image.').optional(),
});
export const category = z.object({ name: z.string().trim().min(2).max(120), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), description: z.string().trim().max(500).optional(), isActive: z.boolean().optional() });
export const variant = z.object({ productId: uuid.optional(), sku: z.string().trim().min(3).max(160), size: z.string().trim().min(1).max(80), colorName: z.string().trim().min(1).max(120), colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/), priceOverridePaise: z.number().int().min(0).nullable().optional(), stockQuantity: z.number().int().min(0).optional(), lowStockThreshold: z.number().int().min(0).max(100000).optional(), status: z.enum(['ACTIVE', 'DISCONTINUED']).optional() });
export const adjustment = z.object({ variantId: uuid, quantity: z.number().int().refine(value => value !== 0), type: z.enum(['RESTOCK', 'ADJUSTMENT', 'DAMAGE', 'RETURN', 'CORRECTION']), reason: z.string().trim().min(3).max(500) });
export const stockCorrection = z.object({ stock: z.number().int().min(0) });
export const orderStatus = z.object({ status: z.enum(['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']) });
export const coupon = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,80}$/), discountType: z.enum(['PERCENTAGE', 'FIXED']), discountValue: z.number().int().min(1), minimumOrderPaise: z.number().int().min(0).nullable().optional(), maximumDiscountPaise: z.number().int().min(0).nullable().optional(), usageLimit: z.number().int().min(1).nullable().optional(), startsAt: z.string().datetime().nullable().optional(), endsAt: z.string().datetime().nullable().optional(), isActive: z.boolean().optional() });
export function input<T extends z.ZodTypeAny>(schema: T, value: unknown): z.output<T> { const parsed = schema.safeParse(value); if (!parsed.success) throw new ValidationError('Invalid request.', parsed.error.flatten()); return parsed.data; }
