import { Prisma, ProductStatus, ReviewStatus, VariantStatus } from '../generated/prisma/client.js';
import { getPrismaClient } from '../config/database.js';
import type { ProductListQuery, ReviewListQuery } from '../validators/product.validator.js';

export const catalogProductSelect = {
  id: true,
  name: true,
  slug: true,
  tagline: true,
  description: true,
  basePricePaise: true,
  compareAtPricePaise: true,
  discountPercent: true,
  fit: true,
  fabric: true,
  collar: true,
  sleeve: true,
  pattern: true,
  careInstructions: true,
  rating: true,
  reviewCount: true,
  isFeatured: true,
  isNewArrival: true,
  isDeal: true,
  createdAt: true,
  images: { select: { url: true }, orderBy: { sortOrder: 'asc' } },
  categories: { select: { category: { select: { id: true, name: true, slug: true } } } },
  variants: {
    select: { id: true, sku: true, size: true, colorName: true, colorHex: true, stockQuantity: true, status: true },
    orderBy: [{ colorName: 'asc' }, { size: 'asc' }],
  },
} satisfies Prisma.ProductSelect;

export type CatalogProductRecord = Prisma.ProductGetPayload<{ select: typeof catalogProductSelect }>;

function equalsAny(values: string[] | undefined): Prisma.StringFilter | undefined {
  return values?.length ? { in: values } : undefined;
}

function buildWhere(query: ProductListQuery): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [{ status: ProductStatus.ACTIVE }];
  const price: Prisma.IntFilter = {};
  if (query.minPrice !== undefined) price.gte = Math.round(query.minPrice * 100);
  if (query.maxPrice !== undefined) price.lte = Math.round(query.maxPrice * 100);
  if (Object.keys(price).length) and.push({ basePricePaise: price });
  if (query.minRating !== undefined) and.push({ rating: { gte: query.minRating } });
  if (query.fit?.length) and.push({ fit: equalsAny(query.fit) });
  if (query.fabric?.length) and.push({ fabric: equalsAny(query.fabric) });
  if (query.sleeve?.length) and.push({ sleeve: equalsAny(query.sleeve) });
  if (query.collar?.length) and.push({ collar: equalsAny(query.collar) });
  if (query.pattern?.length) and.push({ pattern: equalsAny(query.pattern) });
  if (query.deals !== undefined) and.push({ isDeal: query.deals });
  if (query.newArrivals !== undefined) and.push({ isNewArrival: query.newArrivals });
  if (query.category?.length) {
    and.push({ categories: { some: { category: { OR: [{ slug: { in: query.category } }, { name: { in: query.category } }] } } } });
  }
  if (query.size?.length) and.push({ variants: { some: { size: { in: query.size }, status: VariantStatus.ACTIVE } } });
  if (query.color?.length) {
    and.push({ variants: { some: { status: VariantStatus.ACTIVE, OR: [{ colorName: { in: query.color } }, { colorHex: { in: query.color } }] } } });
  }
  if (query.inStock !== undefined) {
    const availableVariant = { status: VariantStatus.ACTIVE, stockQuantity: { gt: 0 } };
    and.push(query.inStock ? { variants: { some: availableVariant } } : { NOT: { variants: { some: availableVariant } } });
  }
  if (query.search) {
    const search = query.search;
    and.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
        { categories: { some: { category: { OR: [{ name: { contains: search, mode: 'insensitive' } }, { slug: { contains: search, mode: 'insensitive' } }] } } } },
      ],
    });
  }
  return { AND: and };
}

function buildOrderBy(sort: ProductListQuery['sort']): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'newest': return [{ createdAt: 'desc' }, { id: 'asc' }];
    case 'price-asc': return [{ basePricePaise: 'asc' }, { id: 'asc' }];
    case 'price-desc': return [{ basePricePaise: 'desc' }, { id: 'asc' }];
    case 'rating': return [{ rating: 'desc' }, { reviewCount: 'desc' }, { id: 'asc' }];
    case 'discount': return [{ discountPercent: 'desc' }, { id: 'asc' }];
    default: return [{ isFeatured: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }];
  }
}

export class ProductRepository {
  async list(query: ProductListQuery): Promise<{ items: CatalogProductRecord[]; total: number }> {
    const prisma = getPrismaClient();
    const where = buildWhere(query);
    const [items, total] = await Promise.all([
      prisma.product.findMany({ where, select: catalogProductSelect, orderBy: buildOrderBy(query.sort), skip: (query.page - 1) * query.limit, take: query.limit }),
      prisma.product.count({ where }),
    ]);
    return { items, total };
  }

  async findByIdentifier(identifier: { value: string; isUuid: boolean }): Promise<CatalogProductRecord | null> {
    return getPrismaClient().product.findFirst({
      where: { status: ProductStatus.ACTIVE, ...(identifier.isUuid ? { id: identifier.value } : { slug: identifier.value }) },
      select: catalogProductSelect,
    });
  }

  async findRelated(productId: string, categoryIds: string[]): Promise<CatalogProductRecord[]> {
    if (!categoryIds.length) return [];
    return getPrismaClient().product.findMany({
      where: { status: ProductStatus.ACTIVE, id: { not: productId }, categories: { some: { categoryId: { in: categoryIds } } } },
      select: catalogProductSelect,
      orderBy: [{ isFeatured: 'desc' }, { rating: 'desc' }, { id: 'asc' }],
      take: 4,
    });
  }

  async findReviews(identifier: { value: string; isUuid: boolean }, query: ReviewListQuery) {
    const prisma = getPrismaClient();
    const product = await this.findByIdentifier(identifier);
    if (!product) return null;
    const orderBy: Prisma.ReviewOrderByWithRelationInput = query.sort === 'oldest'
      ? { createdAt: 'asc' }
      : query.sort === 'rating-high'
        ? { rating: 'desc' }
        : query.sort === 'rating-low'
          ? { rating: 'asc' }
          : { createdAt: 'desc' };
    const where = { productId: product.id, status: ReviewStatus.PUBLISHED };
    const [items, total] = await Promise.all([
      prisma.review.findMany({ where, select: { id: true, rating: true, title: true, content: true, createdAt: true }, orderBy: [orderBy, { id: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
      prisma.review.count({ where }),
    ]);
    return { product, items, total };
  }
}
