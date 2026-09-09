import { getPrismaClient } from '../config/database.js';
import { createHash } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';

const cartInclude = { items: { include: { variant: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } } } }, orderBy: { createdAt: 'asc' as const } } };
type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export class CartService {
  private get prisma() { return getPrismaClient(); }
  private async transaction<T>(userId: string, operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async tx => {
      // One ownership lock serializes all mutations for this user's cart.
      await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${userId}::uuid FOR UPDATE`;
      return operation(tx);
    });
  }
  private async addInside(tx: Prisma.TransactionClient, userId: string, variantId: string, quantity: number) {
    const variant = await tx.productVariant.findFirst({ where: { id: variantId, status: 'ACTIVE', product: { status: 'ACTIVE' } } });
    if (!variant) throw new NotFoundError('Product variant was not found.', 'VARIANT_NOT_FOUND');
    const cart = await tx.cart.upsert({ where: { userId }, create: { userId }, update: { status: 'ACTIVE' } });
    const existing = await tx.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
    const total = quantity + (existing?.quantity ?? 0);
    if (total > variant.stockQuantity || total > 20) throw new ValidationError('Requested quantity is unavailable.', undefined, 'INSUFFICIENT_STOCK');
    await tx.cartItem.upsert({ where: { cartId_variantId: { cartId: cart.id, variantId } }, create: { cartId: cart.id, variantId, quantity }, update: { quantity: total } });
  }
  async merge(userId: string, mergeId: string, items: Array<{ variantId: string; quantity: number }>) {
    const normalized = [...items].sort((a, b) => a.variantId.localeCompare(b.variantId));
    const requestHash = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
    await this.transaction(userId, async tx => {
      const existing = await tx.cartMerge.findUnique({ where: { id: mergeId } });
      if (existing) {
        if (existing.userId !== userId || existing.requestHash !== requestHash) {
          throw new ConflictError('Guest merge identity does not match this cart.', 'CART_MERGE_CONFLICT');
        }
        return;
      }
      for (const item of normalized) await this.addInside(tx, userId, item.variantId, item.quantity);
      await tx.cartMerge.create({ data: { id: mergeId, userId, requestHash } });
    });
    return this.get(userId);
  }
  async get(userId: string) {
    const cart = await this.prisma.cart.upsert({ where: { userId }, create: { userId }, update: { status: 'ACTIVE' }, include: cartInclude });
    return this.present(cart);
  }
  async add(userId: string, variantId: string, quantity: number) {
    await this.transaction(userId, tx => this.addInside(tx, userId, variantId, quantity));
    return this.get(userId);
  }
  async update(userId: string, itemId: string, quantity: number) {
    await this.transaction(userId, async tx => {
    const item = await tx.cartItem.findFirst({ where: { id: itemId, cart: { userId } }, include: { variant: { select: { stockQuantity: true } } } });
    if (!item) throw new NotFoundError('Cart item was not found.', 'CART_ITEM_NOT_FOUND');
    if (quantity > item.variant.stockQuantity) throw new ValidationError('Requested quantity is unavailable.', undefined, 'INSUFFICIENT_STOCK');
    await tx.cartItem.update({ where: { id: itemId }, data: { quantity } });
    });
    return this.get(userId);
  }
  async remove(userId: string, itemId: string) { await this.transaction(userId, async tx => { const result = await tx.cartItem.deleteMany({ where: { id: itemId, cart: { userId } } }); if (!result.count) throw new NotFoundError('Cart item was not found.', 'CART_ITEM_NOT_FOUND'); }); return this.get(userId); }
  async clear(userId: string) { await this.transaction(userId, tx => tx.cartItem.deleteMany({ where: { cart: { userId } } })); return this.get(userId); }
  private present(cart: CartWithItems) {
    return { id: cart.id, items: cart.items.map(item => ({ id: item.id, variantId: item.variantId, quantity: item.quantity, stockQuantity: item.variant.stockQuantity, sku: item.variant.sku, size: item.variant.size, colorName: item.variant.colorName, pricePaise: item.variant.priceOverridePaise ?? item.variant.product.basePricePaise, product: { id: item.variant.product.id, name: item.variant.product.name, slug: item.variant.product.slug, image: item.variant.product.images[0]?.url ?? null } })) };
  }
}
