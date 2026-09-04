import { getPrismaClient } from '../config/database.js';
import type { Prisma } from '../generated/prisma/client.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const cartInclude = { items: { include: { variant: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } } } }, orderBy: { createdAt: 'asc' as const } } };
type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export class CartService {
  private get prisma() { return getPrismaClient(); }
  async get(userId: string) {
    const cart = await this.prisma.cart.upsert({ where: { userId }, create: { userId }, update: { status: 'ACTIVE' }, include: cartInclude });
    return this.present(cart);
  }
  async add(userId: string, variantId: string, quantity: number) {
    const variant = await this.prisma.productVariant.findFirst({ where: { id: variantId, status: 'ACTIVE', product: { status: 'ACTIVE' } }, select: { id: true, stockQuantity: true } });
    if (!variant) throw new NotFoundError('Product variant was not found.', 'VARIANT_NOT_FOUND');
    if (quantity > variant.stockQuantity) throw new ValidationError('Requested quantity is unavailable.', undefined, 'INSUFFICIENT_STOCK');
    const cart = await this.prisma.cart.upsert({ where: { userId }, create: { userId }, update: { status: 'ACTIVE' } });
    const existing = await this.prisma.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
    const total = quantity + (existing?.quantity ?? 0);
    if (total > variant.stockQuantity) throw new ValidationError('Requested quantity is unavailable.', undefined, 'INSUFFICIENT_STOCK');
    await this.prisma.cartItem.upsert({ where: { cartId_variantId: { cartId: cart.id, variantId } }, create: { cartId: cart.id, variantId, quantity }, update: { quantity: total } });
    return this.get(userId);
  }
  async update(userId: string, itemId: string, quantity: number) {
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cart: { userId } }, include: { variant: { select: { stockQuantity: true } } } });
    if (!item) throw new NotFoundError('Cart item was not found.', 'CART_ITEM_NOT_FOUND');
    if (quantity > item.variant.stockQuantity) throw new ValidationError('Requested quantity is unavailable.', undefined, 'INSUFFICIENT_STOCK');
    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } }); return this.get(userId);
  }
  async remove(userId: string, itemId: string) { const result = await this.prisma.cartItem.deleteMany({ where: { id: itemId, cart: { userId } } }); if (!result.count) throw new NotFoundError('Cart item was not found.', 'CART_ITEM_NOT_FOUND'); return this.get(userId); }
  async clear(userId: string) { await this.prisma.cartItem.deleteMany({ where: { cart: { userId } } }); return this.get(userId); }
  private present(cart: CartWithItems) {
    return { id: cart.id, items: cart.items.map(item => ({ id: item.id, variantId: item.variantId, quantity: item.quantity, stockQuantity: item.variant.stockQuantity, sku: item.variant.sku, size: item.variant.size, colorName: item.variant.colorName, pricePaise: item.variant.priceOverridePaise ?? item.variant.product.basePricePaise, product: { id: item.variant.product.id, name: item.variant.product.name, slug: item.variant.product.slug, image: item.variant.product.images[0]?.url ?? null } })) };
  }
}
