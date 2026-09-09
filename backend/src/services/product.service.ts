import type { CatalogProductRecord } from '../repositories/product.repository.js';
import { ProductRepository } from '../repositories/product.repository.js';
import type { CreateReviewInput, ProductListQuery, ReviewListQuery } from '../validators/product.validator.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { getPrismaClient } from '../config/database.js';
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
    pricePaise: record.basePricePaise,
    price: record.basePricePaise / 100,
    ...(record.compareAtPricePaise !== null ? {
      compareAtPricePaise: record.compareAtPricePaise,
      compareAtPrice: record.compareAtPricePaise / 100,
    } : {}),
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
      pricePaise: variant.priceOverridePaise ?? record.basePricePaise,
      price: (variant.priceOverridePaise ?? record.basePricePaise) / 100,
    })),
    fit: record.fit ?? '',
    fabric: record.fabric ?? '',
    collar: record.collar ?? '',
    sleeve: record.sleeve ?? '',
    pattern: record.pattern ?? '',
    careInstructions: record.careInstructions,
    rating: Number(record.rating),
    reviewCount: record.reviewCount,
    editorialRating: record.editorialRating === null ? undefined : Number(record.editorialRating),
    editorialReviewCount: record.editorialReviewCount,
    ratingSource: record.reviewCount > 0 ? 'customer' : record.editorialReviewCount > 0 ? 'editorial' : 'none',
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
    return { items: items.map(toProduct), page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) };
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
        items: result.items.map(review => ({
          id: review.id,
          author: 'Verified customer',
          rating: review.rating,
          date: review.createdAt.toISOString(),
          title: review.title ?? '',
          comment: review.content,
          isVerified: true,
        })),
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / query.limit),
      };
    });
  }

  async createReview(
    userId: string,
    identifier: { value: string; isUuid: boolean },
    input: CreateReviewInput,
  ) {
    const prisma = getPrismaClient();
    const product = await this.repository.findByIdentifier(identifier);
    if (!product) {
      throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
    }

    // 1. Validate verified-purchase requirement
    if (input.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
        include: {
          items: {
            include: {
              variant: true,
            },
          },
        },
      });
      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
      }
      if (order.userId !== userId) {
        throw new ForbiddenError('You cannot create a review for another user\'s order', 'ORDER_FORBIDDEN');
      }
      if (order.status !== 'DELIVERED') {
        throw new BadRequestError('Reviews can only be submitted for delivered orders', 'ORDER_NOT_DELIVERED');
      }
      const containsProduct = order.items.some(
        item => item.variant?.productId === product.id,
      );
      if (!containsProduct) {
        throw new BadRequestError('The specified order does not contain this product', 'PRODUCT_NOT_IN_ORDER');
      }
    } else {
      const deliveredOrder = await prisma.order.findFirst({
        where: {
          userId,
          status: 'DELIVERED',
          items: {
            some: {
              variant: {
                productId: product.id,
              },
            },
          },
        },
      });

      if (!deliveredOrder) {
        const pendingOrder = await prisma.order.findFirst({
          where: {
            userId,
            items: {
              some: {
                variant: {
                  productId: product.id,
                },
              },
            },
          },
        });
        if (pendingOrder) {
          throw new BadRequestError('Reviews can only be submitted after your order has been delivered', 'ORDER_NOT_DELIVERED');
        }
        throw new ForbiddenError('You can only review products you have purchased and received', 'VERIFIED_PURCHASE_REQUIRED');
      }
    }

    // 2. Pre-check for duplicate review
    const existing = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: product.id,
        },
      },
    });
    if (existing) {
      throw new ConflictError('You have already submitted a review for this product.', 'DUPLICATE_REVIEW');
    }

    // 3. Create review & update product aggregate rating inside a transaction
    try {
      const review = await prisma.$transaction(async tx => {
        // Serialize aggregation for different authors reviewing one product.
        await tx.$queryRaw`SELECT id FROM "products" WHERE id = ${product.id}::uuid FOR UPDATE`;
        const created = await tx.review.create({
          data: {
            userId,
            productId: product.id,
            rating: input.rating,
            title: input.title ?? null,
            content: input.comment,
            status: 'PUBLISHED',
          },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        const stats = await tx.review.aggregate({
          where: { productId: product.id, status: 'PUBLISHED' },
          _avg: { rating: true },
          _count: true,
        });

        await tx.product.update({
          where: { id: product.id },
          data: {
            rating: stats._avg.rating ? Number(stats._avg.rating.toFixed(1)) : input.rating,
            reviewCount: stats._count,
          },
        });

        return created;
      });

      // 4. Invalidate affected product and review caches
      await this.cache.delete(`catalog:product:slug:${product.slug}`);
      await this.cache.delete(`catalog:product:id:${product.id}`);
      await Promise.all([
        this.cache.deletePattern(`catalog:reviews:slug:${product.slug}:*`),
        this.cache.deletePattern(`catalog:reviews:id:${product.id}:*`),
      ]);

      const author = `${review.user.firstName || ''} ${review.user.lastName || ''}`.trim() || 'Verified customer';
      return {
        id: review.id,
        author,
        rating: review.rating,
        date: review.createdAt.toISOString(),
        title: review.title ?? '',
        comment: review.content,
        isVerified: true,
      };
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictError('You have already submitted a review for this product.', 'DUPLICATE_REVIEW');
      }
      throw error;
    }
  }
}
