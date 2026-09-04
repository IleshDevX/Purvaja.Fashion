import type { CatalogProductRecord } from '../repositories/product.repository.js';
import { ProductRepository } from '../repositories/product.repository.js';
import type { ProductListQuery, ReviewListQuery } from '../validators/product.validator.js';
import { NotFoundError } from '../utils/errors.js';
import { cacheService, type CacheService } from './cache.service.js';

const REVIEW_CACHE_TTL_SECONDS = 60;

function toProduct(record: CatalogProductRecord) {
  const colors = Array.from(new Map(record.variants.map(variant => [variant.colorName, { name: variant.colorName, hex: variant.colorHex }])).values());
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    tagline: record.tagline ?? '',
    description: record.description,
    price: record.basePricePaise / 100,
    ...(record.compareAtPricePaise !== null ? { compareAtPrice: record.compareAtPricePaise / 100 } : {}),
    ...(record.discountPercent !== null ? { discountPercent: record.discountPercent } : {}),
    images: record.images.map(image => image.url),
    colors,
    sizes: Array.from(new Set(record.variants.map(variant => variant.size))),
    variants: record.variants.map(variant => ({
      id: variant.id,
      color: { name: variant.colorName, hex: variant.colorHex },
      size: variant.size,
      sku: variant.sku,
      inStock: variant.status === 'ACTIVE' && variant.stockQuantity > 0,
      stockCount: variant.stockQuantity,
    })),
    fit: record.fit ?? '',
    fabric: record.fabric ?? '',
    collar: record.collar ?? '',
    sleeve: record.sleeve ?? '',
    pattern: record.pattern ?? '',
    careInstructions: record.careInstructions,
    rating: Number(record.rating),
    reviewCount: record.reviewCount,
    isFeatured: record.isFeatured,
    isNewArrival: record.isNewArrival,
    isDeal: record.isDeal,
    category: record.categories.map(({ category }) => ({ id: category.id, name: category.name, slug: category.slug })),
    inStock: record.variants.some(variant => variant.status === 'ACTIVE' && variant.stockQuantity > 0),
  };
}

export class ProductService {
  constructor(
    private readonly repository = new ProductRepository(),
    private readonly cache: CacheService = cacheService,
  ) {}

  async list(query: ProductListQuery) {
    const { items, total } = await this.repository.list(query);
    return { items: items.map(toProduct), page: query.page, limit: query.limit, pageSize: query.limit, total, totalPages: Math.ceil(total / query.limit) };
  }

  async getDetail(identifier: { value: string; isUuid: boolean }) {
    const product = await this.repository.findByIdentifier(identifier);
    if (!product) throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
    const relatedProducts = await this.repository.findRelated(product.id, product.categories.map(({ category }) => category.id));
    return { product: toProduct(product), relatedProducts: relatedProducts.map(toProduct) };
  }

  async getReviews(identifier: { value: string; isUuid: boolean }, query: ReviewListQuery) {
    const identifierType = identifier.isUuid ? 'id' : 'slug';
    const key = `catalog:reviews:${identifierType}:${identifier.value}:${query.page}:${query.limit}:${query.sort}`;
    return this.cache.getOrSet(key, REVIEW_CACHE_TTL_SECONDS, async () => {
      const result = await this.repository.findReviews(identifier, query);
      if (!result) throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
      return {
        items: result.items.map(review => ({ id: review.id, author: 'Verified customer', rating: review.rating, date: review.createdAt.toISOString(), title: review.title ?? '', comment: review.content })),
        page: query.page,
        limit: query.limit,
        pageSize: query.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / query.limit),
      };
    });
  }
}
