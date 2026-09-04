import { z } from 'zod';
import { ValidationError } from '../utils/errors.js';

const uuid = z.string().uuid();
const quantity = z.coerce.number().int().min(1).max(20);

export const addCartItemSchema = z.object({ variantId: uuid, quantity });
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
  idempotencyKey: uuid.optional(),
}).refine(value => value.addressId || value.shippingAddress, { message: 'A shipping address is required.' });
export const demoResultSchema = z.object({ result: z.enum(['SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED']) });
export const cancelOrderSchema = z.object({ reason: z.string().trim().min(3).max(500) });

export function parse<T extends z.ZodTypeAny>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw new ValidationError('Invalid request.', result.error.flatten());
  return result.data;
}
