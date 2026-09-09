import { z } from 'zod';
import { ValidationError } from '../utils/errors.js';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 24;
const MAX_SEARCH_LENGTH = 120;
const valueList = z.string().max(500).transform(value => value.split(',').map(item => item.trim()).filter(Boolean));
const optionalValueList = valueList.optional();
const idsValueList = z.string().max(4000).transform(value => value.split(',').map(item => item.trim()).filter(Boolean));
const booleanValue = z.enum(['true', 'false']).transform(value => value === 'true');

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  search: z.string().trim().max(MAX_SEARCH_LENGTH).optional(),
  ids: idsValueList.optional(),
  category: optionalValueList,
  fit: optionalValueList,
  fabric: optionalValueList,
  size: optionalValueList,
  color: optionalValueList,
  sleeve: optionalValueList,
  collar: optionalValueList,
  pattern: optionalValueList,
  minPricePaise: z.coerce.number().int().min(0).optional(),
  maxPricePaise: z.coerce.number().int().min(0).optional(),
  minRating: z.coerce.number().finite().min(0).max(5).optional(),
  inStock: booleanValue.optional(),
  deals: booleanValue.optional(),
  newArrivals: booleanValue.optional(),
  sort: z.enum(['featured', 'newest', 'price-asc', 'price-desc', 'rating', 'discount']).default('featured'),
}).superRefine((value, context) => {
  if (value.minPricePaise !== undefined && value.maxPricePaise !== undefined && value.minPricePaise > value.maxPricePaise) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'minPricePaise must not exceed maxPricePaise', path: ['minPricePaise'] });
  }
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  sort: z.enum(['newest', 'oldest', 'rating-high', 'rating-low']).default('newest'),
});

export type ProductListQuery = z.output<typeof listQuerySchema>;
export type ReviewListQuery = z.output<typeof paginationSchema>;

function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid query parameters', result.error.flatten());
  }
  return result.data as z.output<T>;
}

export function parseProductListQuery(input: unknown): ProductListQuery {
  return parse(listQuerySchema, input);
}

export function parseReviewListQuery(input: unknown): ReviewListQuery {
  return parse(paginationSchema, input);
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseProductIdentifier(value: string): { value: string; isUuid: boolean } {
  if (uuidPattern.test(value)) {
    return { value, isUuid: true };
  }
  if (slugPattern.test(value) && value.length <= 255) {
    return { value, isUuid: false };
  }
  throw new ValidationError('Product identifier must be a UUID or URL-safe slug');
}

export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  title: z.string().trim().max(200).optional(),
  comment: z.string().trim().min(5, 'Review content must be at least 5 characters').max(2000, 'Review content cannot exceed 2000 characters'),
  orderId: z.string().uuid('Invalid order ID').optional(),
  isVerified: z.boolean().optional(),
});

export type CreateReviewInput = z.output<typeof createReviewSchema>;

export function parseCreateReviewInput(input: unknown): CreateReviewInput {
  return parse(createReviewSchema, input);
}
