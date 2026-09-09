import { z } from 'zod';
import { ValidationError } from '../utils/errors.js';

const uuid = z.string().uuid();
const quantity = z.coerce.number().int().min(1).max(20);

export const addCartItemSchema = z.object({ variantId: uuid, quantity });
export const mergeCartSchema = z.object({
  mergeId: uuid,
  items: z.array(addCartItemSchema).min(1).max(100),
}).refine(value => new Set(value.items.map(item => item.variantId)).size === value.items.length, {
  message: 'Each variant must appear only once in a guest cart merge.',
});
export const updateCartItemSchema = z.object({ quantity });
export const addressSchema = z.object({
  recipientName: z.string().trim().min(2).max(160), phone: z.string().trim().min(7).max(32),
  line1: z.string().trim().min(3).max(255), line2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(2).max(120), state: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().min(3).max(32), country: z.string().trim().length(2).default('IN'), isDefault: z.boolean().optional(),
});
export const checkoutSchema = z.object({
  addressId: uuid.optional(),
  shippingAddress: addressSchema.optional(),
  deliveryOptionId: z.enum(['standard', 'express']).default('standard'),
  couponCode: z.string().trim().min(1).max(80).optional(),
  idempotencyKey: z.string().trim().min(1).max(128).optional(),
  cartSnapshot: z.array(z.object({
    variantId: uuid,
    quantity,
    unitPricePaise: z.number().int().min(0),
  })).min(1).max(100).optional(),
}).refine(value => value.addressId || value.shippingAddress, { message: 'A shipping address is required.' });
export const demoResultSchema = z.object({ result: z.enum(['SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED']) });
export const phonepeCallbackSchema = z.object({ response: z.string().min(1) });
export const cancelOrderSchema = z.object({ reason: z.string().trim().min(3).max(500) });
export const returnOrderSchema = z.object({
  reason: z.string().trim().min(3).max(500),
  items: z.array(z.object({
    orderItemId: uuid,
    quantity: z.number().int().min(1),
  })).optional(),
});
export const validateCouponSchema = z.object({
  code: z.string().trim().min(1).max(80),
  subtotalPaise: z.coerce.number().int().min(0),
});

export const orderListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum([
    'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY',
    'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'PAYMENT_FAILED',
  ]).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  sort: z.enum(['newest', 'oldest', 'total-high', 'total-low']).default('newest'),
});
export type OrderListQuery = z.output<typeof orderListSchema>;

export function parse<T extends z.ZodTypeAny>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw new ValidationError('Invalid request.', result.error.flatten());
  return result.data;
}
