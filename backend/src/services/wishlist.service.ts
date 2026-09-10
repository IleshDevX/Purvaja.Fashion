import { getPrismaClient } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';

export class WishlistService {
  private get prisma() {
    return getPrismaClient();
  }

  async getWishlist(userId: string): Promise<string[]> {
    const items = await this.prisma.wishlistItem.findMany({
      where: { userId },
      select: { productId: true },
      orderBy: { createdAt: 'desc' },
    });
    return items.map(item => item.productId);
  }

  async addToWishlist(userId: string, productId: string): Promise<string[]> {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundError('Product was not found.', 'PRODUCT_NOT_FOUND');
    }

    await this.prisma.wishlistItem.upsert({
      where: {
        userId_productId: { userId, productId },
      },
      create: { userId, productId },
      update: {},
    });

    return this.getWishlist(userId);
  }

  async removeFromWishlist(userId: string, productId: string): Promise<string[]> {
    await this.prisma.wishlistItem.deleteMany({
      where: { userId, productId },
    });
    return this.getWishlist(userId);
  }

  async syncWishlist(userId: string, productIds: string[]): Promise<string[]> {
    if (!productIds || !productIds.length) {
      return this.getWishlist(userId);
    }

    // Verify valid product IDs
    const validProducts = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });

    for (const prod of validProducts) {
      await this.prisma.wishlistItem.upsert({
        where: { userId_productId: { userId, productId: prod.id } },
        create: { userId, productId: prod.id },
        update: {},
      });
    }

    return this.getWishlist(userId);
  }
}

export const wishlistService = new WishlistService();
