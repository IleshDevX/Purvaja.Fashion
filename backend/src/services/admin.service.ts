import { getPrismaClient } from '../config/database.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import { sanitizeAuditMetadata } from '../utils/audit.js';
import { changeStock, lockInventory } from './inventory.service.js';
import { requestRefund } from './payment-lifecycle.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { z } from 'zod';
import type { adjustment, category, coupon, inventoryQuery, product, variant } from '../validators/admin.validator.js';
type ProductInput = z.output<typeof product>;
type CategoryInput = z.output<typeof category>;
type VariantInput = z.output<typeof variant>;
type AdjustmentInput = z.output<typeof adjustment>;
type CouponInput = z.output<typeof coupon>;
type InventoryQuery = z.output<typeof inventoryQuery>;

const page = <T>(items: T[], total: number, current: number, limit: number) => ({
  items,
  page: current,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

export class AdminService {
  private get prisma() {
    return getPrismaClient();
  }

  private async audit(
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: object,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        metadata: sanitizeAuditMetadata(metadata) as Prisma.InputJsonValue,
      },
    });
  }

  private async lockActor(tx: Prisma.TransactionClient, actorId: string): Promise<void> {
    // AuditLog's actor foreign key acquires a user-row key-share lock. Acquire
    // it before product/variant/order locks so audit insertion cannot invert
    // the user -> inventory order used by cart and checkout transactions.
    await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${actorId}::uuid FOR KEY SHARE`;
  }

  private async lockProducts(tx: Prisma.TransactionClient, productIds: string[]): Promise<void> {
    const ids=[...new Set(productIds)].sort();
    if (!ids.length) return;
    await tx.$queryRaw`SELECT id FROM "products" WHERE id = ANY(ARRAY[${Prisma.join(ids)}]::uuid[]) ORDER BY id FOR UPDATE`;
  }

  private async assertPublicationReady(tx: Prisma.TransactionClient, productId: string): Promise<void> {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: {
        status: true,
        fit: true,
        fabric: true,
        collar: true,
        sleeve: true,
        pattern: true,
        _count: {
          select: {
            categories: { where: { category: { isActive: true } } },
            images: { where: { isPrimary: true } },
            variants: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });
    if (!product || product.status !== 'ACTIVE') return;
    const missing = [
      !product.fit && 'fit',
      !product.fabric && 'fabric',
      !product.collar && 'collar',
      !product.sleeve && 'sleeve',
      !product.pattern && 'pattern',
      product._count.categories === 0 && 'active category',
      product._count.images === 0 && 'primary image',
      product._count.variants === 0 && 'active variant',
    ].filter(Boolean);
    if (missing.length > 0) {
      throw new ValidationError(`Product cannot be published until it has: ${missing.join(', ')}.`, undefined, 'PRODUCT_NOT_PUBLISHABLE');
    }
  }

  async dashboard() {
    const [[metrics], recentOrders] = await Promise.all([
      this.prisma.$queryRaw<Array<{
        total_products: bigint;
        total_customers: bigint;
        total_orders: bigint;
        pending_payments: bigint;
        confirmed_orders: bigint;
        processing_orders: bigint;
        low_stock_variants: bigint;
        out_of_stock_variants: bigint;
        total_revenue_paise: bigint;
        total_units_sold: bigint;
      }>>`
        SELECT
          (SELECT COUNT(*) FROM products) AS total_products,
          (SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER') AS total_customers,
          (SELECT COUNT(*) FROM orders) AS total_orders,
          (SELECT COUNT(*) FROM orders WHERE payment_status IN ('PENDING', 'INITIATED')) AS pending_payments,
          (SELECT COUNT(*) FROM orders WHERE status = 'CONFIRMED') AS confirmed_orders,
          (SELECT COUNT(*) FROM orders WHERE status = 'PROCESSING') AS processing_orders,
          (SELECT COUNT(*) FROM product_variants WHERE stock_quantity > 0 AND stock_quantity <= low_stock_threshold) AS low_stock_variants,
          (SELECT COUNT(*) FROM product_variants WHERE stock_quantity = 0) AS out_of_stock_variants,
          COALESCE((
            (SELECT COALESCE(SUM(total_paise), 0) FROM orders WHERE payment_status IN ('SUCCESS', 'PAID') AND status != 'CANCELLED')
            -
            (SELECT COALESCE(SUM(amount_paise), 0) FROM payment_refunds WHERE status = 'SUCCEEDED')
          ), 0) AS total_revenue_paise,
          COALESCE((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.payment_status IN ('SUCCESS', 'PAID') AND o.status != 'CANCELLED'
          ), 0) AS total_units_sold
      `,
      this.prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          items: true,
          payments: { select: { provider: true }, take: 1 },
        },
      }),
    ]);

    const totalProducts = Number(metrics?.total_products ?? 0n);
    const totalCustomers = Number(metrics?.total_customers ?? 0n);
    const totalOrders = Number(metrics?.total_orders ?? 0n);
    const pendingPayments = Number(metrics?.pending_payments ?? 0n);
    const confirmedOrders = Number(metrics?.confirmed_orders ?? 0n);
    const processingOrders = Number(metrics?.processing_orders ?? 0n);
    const lowStockVariants = Number(metrics?.low_stock_variants ?? 0n);
    const outOfStockVariants = Number(metrics?.out_of_stock_variants ?? 0n);
    const totalRevenue = Number(metrics?.total_revenue_paise ?? 0n) / 100;
    const shirtsSold = Number(metrics?.total_units_sold ?? 0n);

    return {
      totalProducts,
      totalCustomers,
      totalOrders,
      pendingPayments,
      confirmedOrders,
      processingOrders,
      lowStockVariants,
      outOfStockVariants,
      recentOrders,
      totalRevenue,
      shirtsSold,
      activeCustomers: totalCustomers,
      pendingOrders: pendingPayments,
      lowStockCount: lowStockVariants,
    };
  }

  async products(q: { page: number; limit: number; search?: string }) {
    const where = q.search
      ? {
          OR: [
            { name: { contains: q.search, mode: 'insensitive' as const } },
            { slug: { contains: q.search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          basePricePaise: true,
          status: true,
          categories: {
            select: { category: { select: { id: true, name: true, slug: true } } },
          },
          variants: { select: { stockQuantity: true } },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return page(items, total, q.page, q.limit);
  }

  async product(id: string) {
    const item = await this.prisma.product.findUnique({
      where: { id },
      include: {
        categories: { include: { category: true } },
        variants: true,
        images: true,
      },
    });
    if (!item) throw new NotFoundError('Product was not found.', 'PRODUCT_NOT_FOUND');
    return item;
  }

  async createProduct(actor: string, value: ProductInput) {
    const { categoryIds, images, ...data } = value;
    try {
      return await this.prisma.$transaction(async tx => {
        await this.lockActor(tx, actor);
        const result = await tx.product.create({
          data: {
            ...data,
            categories: categoryIds
              ? { create: categoryIds.map(categoryId => ({ categoryId })) }
              : undefined,
            images: images
              ? { create: images.map((image, sortOrder) => ({ ...image, sortOrder })) }
              : undefined,
          },
          include: {
            categories: { include: { category: true } },
            variants: true,
            images: true,
          },
        });
        if (result.compareAtPricePaise !== null && result.compareAtPricePaise < result.basePricePaise) {
          throw new ValidationError('Compare-at price must be greater than or equal to the base price.', undefined, 'INVALID_COMPARE_PRICE');
        }
        await this.assertPublicationReady(tx, result.id);
        await this.audit(actor, 'PRODUCT_CREATED', 'product', result.id, { slug: result.slug }, tx);
        return result;
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictError('Product slug already exists.', 'DUPLICATE_SLUG');
      }
      if ((error as { code?: string })?.code === 'P2003') throw new ValidationError('One or more categories do not exist.', undefined, 'INVALID_CATEGORY');
      throw error;
    }
  }

  async updateProduct(actor: string, id: string, value: Partial<ProductInput>) {
    const exists = await this.prisma.product.findUnique({ where: { id } });
    if (!exists) throw new NotFoundError('Product was not found.', 'PRODUCT_NOT_FOUND');
    const { categoryIds, images, ...data } = value;
    try {
      return await this.prisma.$transaction(async tx => {
        await this.lockActor(tx, actor);
        await this.lockProducts(tx, [id]);
        const result = await tx.product.update({
          where: { id },
          data: {
            ...data,
            categories: categoryIds
              !== undefined ? {
                  deleteMany: {},
                  create: categoryIds.map(categoryId => ({ categoryId })),
                }
              : undefined,
            images: images !== undefined
              ? {
                  deleteMany: {},
                  create: images.map((image, sortOrder) => ({ ...image, sortOrder })),
                }
              : undefined,
          },
          include: {
            categories: { include: { category: true } },
            variants: true,
            images: true,
          },
        });
        if (result.compareAtPricePaise !== null && result.compareAtPricePaise < result.basePricePaise) {
          throw new ValidationError('Compare-at price must be greater than or equal to the base price.', undefined, 'INVALID_COMPARE_PRICE');
        }
        await this.assertPublicationReady(tx, result.id);
        await this.audit(actor, 'PRODUCT_UPDATED', 'product', id, undefined, tx);
        return result;
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictError('Product slug already exists.', 'DUPLICATE_SLUG');
      }
      if ((error as { code?: string })?.code === 'P2003') throw new ValidationError('One or more categories do not exist.', undefined, 'INVALID_CATEGORY');
      throw error;
    }
  }

  async categories(query?: { page?: number; limit?: number }) {
    if (query?.page || query?.limit) {
      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
      const [total, items] = await Promise.all([
        this.prisma.category.count(),
        this.prisma.category.findMany({
          orderBy: { name: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);
      return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
    }
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async createCategory(actor: string, value: CategoryInput) {
    try {
      return await this.prisma.$transaction(async tx => {
        await this.lockActor(tx, actor);
        const result = await tx.category.create({ data: value });
        await this.audit(actor, 'CATEGORY_CREATED', 'category', result.id, undefined, tx);
        return result;
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictError('Category slug already exists.', 'DUPLICATE_SLUG');
      }
      throw error;
    }
  }

  async updateCategory(actor: string, id: string, value: Partial<CategoryInput>) {
    try {
      return await this.prisma.$transaction(async tx => {
        await this.lockActor(tx, actor);
        const linkedProducts=value.isActive===false
          ? await tx.productCategory.findMany({where:{categoryId:id},select:{productId:true}})
          : [];
        await this.lockProducts(tx,linkedProducts.map(link=>link.productId));
        const result = await tx.category.update({ where: { id }, data: value });
        if (value.isActive === false) {
          const published = await tx.productCategory.findMany({
            where: { categoryId: id, product: { status: 'ACTIVE' } },
            select: { productId: true },
          });
          for (const link of published) await this.assertPublicationReady(tx, link.productId);
        }
        await this.audit(actor, 'CATEGORY_UPDATED', 'category', id, undefined, tx);
        return result;
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictError('Category was not found or slug already exists.', 'CATEGORY_CONFLICT');
      }
      throw error;
    }
  }

  async variants(q: { page: number; limit: number; search?: string }) {
    const where = q.search
      ? {
          OR: [
            { sku: { contains: q.search, mode: 'insensitive' as const } },
            { size: { contains: q.search, mode: 'insensitive' as const } },
            { colorName: { contains: q.search, mode: 'insensitive' as const } },
            { product: { name: { contains: q.search, mode: 'insensitive' as const } } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.productVariant.findMany({
        where,
        include: { product: { select: { id: true, name: true, slug: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.productVariant.count({ where }),
    ]);
    return page(items, total, q.page, q.limit);
  }

  async createVariant(actor: string, value: VariantInput) {
    if (!value.productId) throw new ValidationError('productId is required.');
    const { productId, ...variantData } = value;
    try {
      return await this.prisma.$transaction(async tx => {
        await this.lockActor(tx, actor);
        await this.lockProducts(tx, [productId]);
        const result = await tx.productVariant.create({
          data: {
            ...variantData,
            stockQuantity: 0,
            productId,
            priceOverridePaise: value.priceOverridePaise ?? undefined,
          },
        });
        await this.audit(actor, 'VARIANT_CREATED', 'variant', result.id, { sku: result.sku }, tx);
        if (value.stockQuantity) return (await changeStock(tx, result.id, { delta: value.stockQuantity }, {
          type: 'INITIAL', reason: 'Initial variant stock', referenceType: 'ADMIN_ADJUSTMENT',
        })).updated;
        return result;
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictError(
          'Variant SKU or size/color combination already exists.',
          'DUPLICATE_VARIANT',
        );
      }
      throw error;
    }
  }

  async updateVariant(actor: string, id: string, value: Partial<VariantInput>) {
    try {
      return await this.prisma.$transaction(async tx => {
        await this.lockActor(tx, actor);
        const existing=await tx.productVariant.findUnique({where:{id},select:{productId:true}});
        if(!existing) throw new NotFoundError('Variant was not found.', 'VARIANT_NOT_FOUND');
        await this.lockProducts(tx,[existing.productId]);
        const { stockQuantity, ...attributes } = value;
        if (stockQuantity !== undefined) {
          await changeStock(tx, id, { target: stockQuantity }, {
            type: 'CORRECTION', reason: 'Admin variant stock correction', referenceType: 'ADMIN_ADJUSTMENT',
          });
        }
        const result = await tx.productVariant.update({
          where: { id },
          data: { ...attributes, productId: undefined },
        });
        await this.assertPublicationReady(tx, result.productId);
        await this.audit(actor, 'VARIANT_UPDATED', 'variant', id, undefined, tx);
        return result;
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictError('Variant was not found or SKU already exists.', 'VARIANT_CONFLICT');
      }
      throw error;
    }
  }
  async inventory(q: InventoryQuery) {
    const searchWhere: Prisma.ProductVariantWhereInput = q.search
      ? {
          OR: [
            { sku: { contains: q.search, mode: 'insensitive' as const } },
            { colorName: { contains: q.search, mode: 'insensitive' as const } },
            { size: { contains: q.search, mode: 'insensitive' as const } },
            { product: { name: { contains: q.search, mode: 'insensitive' as const } } },
            { product: { slug: { contains: q.search, mode: 'insensitive' as const } } },
          ],
        }
      : {};

    let variantIdsFilter: string[] | undefined;
    if (q.filter === 'low_stock') {
      const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM product_variants WHERE stock_quantity > 0 AND stock_quantity <= low_stock_threshold
      `;
      variantIdsFilter = rows.map(r => r.id);
    } else if (q.filter === 'in_stock') {
      const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM product_variants WHERE stock_quantity > low_stock_threshold
      `;
      variantIdsFilter = rows.map(r => r.id);
    }

    const stockWhere: Prisma.ProductVariantWhereInput =
      q.filter === 'out_of_stock'
        ? { stockQuantity: 0 }
        : variantIdsFilter
          ? { id: { in: variantIdsFilter } }
          : {};

    const where: Prisma.ProductVariantWhereInput = {
      ...searchWhere,
      ...stockWhere,
    };

    const [variants, total] = await Promise.all([
      this.prisma.productVariant.findMany({
        where,
        select: {
          id: true,
          productId: true,
          sku: true,
          colorName: true,
          size: true,
          stockQuantity: true,
          lowStockThreshold: true,
          updatedAt: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          inventoryReservations: {
            where: { status: 'ACTIVE' },
            select: { quantity: true },
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.productVariant.count({ where }),
    ]);

    const items = variants.map(v => {
      const reserved = v.inventoryReservations.reduce((s, r) => s + r.quantity, 0);
      // stockQuantity is decremented when a reservation is created; subtracting
      // active reservations here would report the same hold twice.
      const available = v.stockQuantity;
      const status: 'out_of_stock' | 'low_stock' | 'in_stock' =
        available <= 0
          ? 'out_of_stock'
          : available <= v.lowStockThreshold
            ? 'low_stock'
            : 'in_stock';
      return {
        id: v.id,
        shirtId: v.productId,
        shirtName: v.product.name,
        slug: v.product.slug,
        sku: v.sku,
        color: v.colorName,
        size: v.size,
        stock: v.stockQuantity,
        reservedStock: reserved,
        availableStock: available,
        lowStockThreshold: v.lowStockThreshold,
        status,
        lastUpdated: v.updatedAt.toISOString(),
      };
    });

    return page(items, total, q.page, q.limit);
  }
  async movements(q: { page: number; limit: number }) {
    const [items, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        include: { variant: { include: { product: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.inventoryMovement.count(),
    ]);
    return page(items, total, q.page, q.limit);
  }

  async reservations(q: { page: number; limit: number }) {
    const [items, total] = await Promise.all([
      this.prisma.inventoryReservation.findMany({
        include: {
          order: { select: { id: true, orderNumber: true } },
          variant: { include: { product: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.inventoryReservation.count(),
    ]);
    return page(items, total, q.page, q.limit);
  }

  async adjust(actor: string, value: AdjustmentInput) {
    return this.prisma.$transaction(async tx => {
      await this.lockActor(tx, actor);
      const { updated, previousQuantity, resultingQuantity } = await changeStock(tx, value.variantId, { delta: value.quantity }, {
        type: value.type, reason: value.reason, referenceType: 'ADMIN_ADJUSTMENT',
      });

      await tx.auditLog.create({
        data: {
          actorId: actor,
          action: 'INVENTORY_ADJUSTED',
          entityType: 'variant',
          entityId: value.variantId,
          metadata: sanitizeAuditMetadata({
            quantity: value.quantity,
            previous: previousQuantity,
            resulting: resultingQuantity,
            type: value.type,
          }) as Prisma.InputJsonValue,
        },
      });

      return updated;
    });
  }

  async setStock(actor: string, variantId: string, stock: number) {
    return this.prisma.$transaction(async tx => {
      await this.lockActor(tx, actor);
      const { updated, previousQuantity, delta } = await changeStock(tx, variantId, { target: stock }, {
        type: 'CORRECTION', reason: 'Admin stock correction', referenceType: 'ADMIN_ADJUSTMENT',
      });
      await this.audit(actor, 'INVENTORY_ADJUSTED', 'variant', variantId, {
        quantity: delta,
        previous: previousQuantity,
        resulting: stock,
        type: 'CORRECTION',
      }, tx);
      return updated;
    });
  }

  async orders(q: { page: number; limit: number; search?: string }) {
    const where = q.search
      ? {
          OR: [
            { orderNumber: { contains: q.search, mode: 'insensitive' as const } },
            { user: { email: { contains: q.search, mode: 'insensitive' as const } } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          totalPaise: true,
          createdAt: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          items: { select: { quantity: true } },
          payments: { select: { provider: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return page(items, total, q.page, q.limit);
  }

  async order(id: string) {
    const item = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
        items: true,
        payments: { include: { refunds: { orderBy: { requestedAt: 'desc' } } } },
        returnRequest: { include: { items: true } },
      },
    });
    if (!item) throw new NotFoundError('Order was not found.', 'ORDER_NOT_FOUND');
    const allowedTransitions: Record<string, Array<'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED'>> = {
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED'],
      DELIVERED: [],
      CANCELLED: [],
      RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
      RETURNED: [],
    };
    return {
      ...item,
      allowedActions: allowedTransitions[item.status] ?? [],
    };
  }
  async updateOrderStatus(actor: string, id: string, status: 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED') {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "payments" WHERE order_id = ${id}::uuid ORDER BY id FOR UPDATE`;
      await this.lockActor(tx, actor);
      await tx.$queryRaw`SELECT id FROM "orders" WHERE id = ${id}::uuid FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { id }, include: { items: true, payments: true, returnRequest: { include: { items: true } } } });
      if (!order) throw new NotFoundError('Order was not found.', 'ORDER_NOT_FOUND');
      const allowed: Record<string, string[]> = {
        CONFIRMED: ['PROCESSING', 'CANCELLED'],
        PROCESSING: ['SHIPPED', 'CANCELLED'],
        SHIPPED: ['DELIVERED'],
        DELIVERED: ['RETURN_REQUESTED'],
        RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
      };
      if (!allowed[order.status]?.includes(status)) {
        throw new ValidationError('Invalid order status transition.', undefined, 'INVALID_ORDER_TRANSITION');
      }

      if (status === 'CANCELLED' || status === 'RETURNED') {
        const returnItems = status === 'RETURNED' && order.returnRequest
          ? order.returnRequest.items
          : order.items.map(item => ({ orderItemId: item.id, quantity: item.quantity }));
        if (status === 'RETURNED' && !order.returnRequest) {
          // Legacy RETURN_REQUESTED rows created before return requests were
          // persisted are treated as a full-order return exactly once.
        }
        await lockInventory(tx, order.items.flatMap(item => item.variantId ? [item.variantId] : []));
        for (const requested of returnItems) {
          const item = order.items.find(candidate => candidate.id === requested.orderItemId);
          if (!item) throw new ValidationError('Return item was not found.', undefined, 'RETURN_ITEM_NOT_FOUND');
          if (item.variantId) {
            const quantity = 'orderItemId' in requested ? requested.quantity : item.quantity;
            await changeStock(tx, item.variantId, { delta: quantity }, {
              type: status === 'CANCELLED' ? 'CANCELLATION' : 'RETURN',
              reason: `Admin order status update to ${status}`,
              referenceType: 'ORDER', referenceId: id,
            });
          }
        }
        const capturedPayment = order.payments.find(payment => ['SUCCESS', 'PAID'].includes(payment.status));
        if (capturedPayment) {
          const returnedGrossPaise = status === 'RETURNED'
            ? returnItems.reduce((sum, requested) => {
                const item = order.items.find(candidate => candidate.id === requested.orderItemId)!;
                return sum + Math.floor((item.lineTotalPaise * requested.quantity) / item.quantity);
              }, 0)
            : order.subtotalPaise;
          const allUnitsReturned = status === 'CANCELLED' || order.items.every(item => {
            const requested = returnItems.find(candidate => candidate.orderItemId === item.id);
            return requested?.quantity === item.quantity;
          });
          const refundableMerchandisePaise = Math.max(0, order.subtotalPaise - order.discountPaise);
          const amountPaise = allUnitsReturned
            ? capturedPayment.amountPaise
            : Math.floor((returnedGrossPaise * refundableMerchandisePaise) / Math.max(1, order.subtotalPaise));
          if (amountPaise > 0) {
            await requestRefund(tx, {
              paymentId: capturedPayment.id,
              returnId: status === 'RETURNED' ? order.returnRequest?.id : undefined,
              amountPaise,
              reason: status === 'CANCELLED' ? 'ORDER_CANCELLED' : 'RETURN',
              idempotencyKey: status === 'CANCELLED'
                ? `order-cancel:${order.id}`
                : `return:${order.returnRequest?.id ?? order.id}`,
            });
          }
        }
      }

      const updated = await tx.order.update({
        where: { id },
        data: {
          status,
        },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
          items: true,
          payments: { include: { refunds: { orderBy: { requestedAt: 'desc' } } } },
          returnRequest: { include: { items: true } },
        },
      });

      if (status === 'RETURNED' && order.returnRequest) {
        await tx.orderReturn.update({
          where: { id: order.returnRequest.id },
          data: { status: 'COMPLETED', processedAt: new Date() },
        });
      } else if (status === 'DELIVERED' && order.status === 'RETURN_REQUESTED' && order.returnRequest) {
        await tx.orderReturn.update({
          where: { id: order.returnRequest.id },
          data: { status: 'REJECTED', processedAt: new Date() },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: actor,
          action: 'ORDER_STATUS_UPDATED',
          entityType: 'order',
          entityId: id,
          metadata: sanitizeAuditMetadata({ from: order.status, to: status }) as Prisma.InputJsonValue,
        },
      });

      return updated;
    });
  }
  async customers(q: { page: number; limit: number; search?: string }) {
    const where = {
      role: 'CUSTOMER' as const,
      ...(q.search
        ? {
            OR: [
              { email: { contains: q.search, mode: 'insensitive' as const } },
              { firstName: { contains: q.search, mode: 'insensitive' as const } },
              { lastName: { contains: q.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          status: true,
          emailVerifiedAt: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return page(items, total, q.page, q.limit);
  }

  async customer(id: string) {
    const item = await this.prisma.user.findFirst({
      where: { id, role: 'CUSTOMER' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        orders: {
          select: {
            id: true,
            orderNumber: true,
            totalPaise: true,
            status: true,
            paymentStatus: true,
            createdAt: true,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          take: 50,
        },
        _count: { select: { orders: true } },
      },
    });

    if (!item) throw new NotFoundError('Customer was not found.', 'CUSTOMER_NOT_FOUND');
    return item;
  }

  async coupons(query?: { page?: number; limit?: number }) {
    if (query?.page || query?.limit) {
      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
      const [total, items] = await Promise.all([
        this.prisma.coupon.count(),
        this.prisma.coupon.findMany({
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);
      return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
    }
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createCoupon(actor: string, value: CouponInput) {
    try {
      return await this.prisma.$transaction(async tx => {
        await this.lockActor(tx, actor);
        const result = await tx.coupon.create({
          data: {
            ...value,
            startsAt: value.startsAt ? new Date(value.startsAt) : undefined,
            endsAt: value.endsAt ? new Date(value.endsAt) : undefined,
          },
        });
        await this.audit(actor, 'COUPON_CREATED', 'coupon', result.id, undefined, tx);
        return result;
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictError('Coupon code already exists.', 'DUPLICATE_COUPON');
      }
      throw error;
    }
  }

  async updateCoupon(actor: string, id: string, value: Partial<CouponInput>) {
    try {
      return await this.prisma.$transaction(async tx => {
        await this.lockActor(tx, actor);
        const result = await tx.coupon.update({
          where: { id },
          data: {
            ...value,
            startsAt: value.startsAt === null ? null : value.startsAt ? new Date(value.startsAt) : undefined,
            endsAt: value.endsAt === null ? null : value.endsAt ? new Date(value.endsAt) : undefined,
          },
        });

        await this.audit(actor, 'COUPON_UPDATED', 'coupon', id, undefined, tx);
        return result;
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2025') {
        throw new NotFoundError('Coupon was not found.', 'COUPON_NOT_FOUND');
      }
      throw error;
    }
  }

  async auditLogs(q: { page: number; limit: number }) {
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        include: {
          actor: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.auditLog.count(),
    ]);

    return page(items, total, q.page, q.limit);
  }
}
