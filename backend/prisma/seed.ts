import { getPrismaClient, disconnectDatabase } from '../src/config/database.js';
import { PRODUCT_SEED } from '../src/seeds/products.seed.js';

const EXPECTED_PRODUCTS = 50;
const EXPECTED_VARIANTS = 300;

function productData(product: (typeof PRODUCT_SEED)[number]) {
  return {
    name: product.name,
    tagline: product.tagline,
    description: product.description,
    brand: 'Purvaja',
    basePricePaise: product.price * 100,
    compareAtPricePaise: product.compareAtPrice ? product.compareAtPrice * 100 : null,
    discountPercent: product.discountPercent ?? null,
    status: 'ACTIVE' as const,
    fit: product.fit,
    fabric: product.fabric,
    collar: product.collar,
    sleeve: product.sleeve,
    pattern: product.pattern,
    careInstructions: product.careInstructions,
    rating: product.rating,
    reviewCount: product.reviewCount,
    isFeatured: product.isFeatured ?? false,
    isNewArrival: product.isNewArrival ?? false,
    isDeal: product.isDeal ?? false,
    metadata: { legacyProductId: product.id, colors: product.colors, sizes: product.sizes },
  };
}

export async function seedDatabase(): Promise<void> {
  const prisma = getPrismaClient();
  await prisma.$transaction(async tx => {
    const category = await tx.category.upsert({
      where: { slug: 'shirts' },
      create: { name: 'Shirts', slug: 'shirts', description: 'Purvaja shirt collection.' },
      update: { name: 'Shirts', description: 'Purvaja shirt collection.' },
    });

    for (const product of PRODUCT_SEED) {
      const saved = await tx.product.upsert({
        where: { slug: product.slug },
        create: { slug: product.slug, ...productData(product) },
        update: productData(product),
      });
      await tx.productCategory.upsert({
        where: { productId_categoryId: { productId: saved.id, categoryId: category.id } },
        create: { productId: saved.id, categoryId: category.id },
        update: {},
      });
      for (const [sortOrder, url] of product.images.entries()) {
        await tx.productImage.upsert({
          where: { productId_sortOrder: { productId: saved.id, sortOrder } },
          create: { productId: saved.id, url, sortOrder, isPrimary: sortOrder === 0 },
          update: { url, isPrimary: sortOrder === 0 },
        });
      }
      for (const variant of product.variants) {
        await tx.productVariant.upsert({
          where: { sku: variant.sku },
          create: {
            productId: saved.id,
            sku: variant.sku,
            size: variant.size,
            colorName: variant.color.name,
            colorHex: variant.color.hex,
            stockQuantity: variant.stockCount,
            status: variant.inStock ? 'ACTIVE' : 'DISCONTINUED',
          },
          update: {
            productId: saved.id,
            size: variant.size,
            colorName: variant.color.name,
            colorHex: variant.color.hex,
            stockQuantity: variant.stockCount,
            status: variant.inStock ? 'ACTIVE' : 'DISCONTINUED',
          },
        });
      }
    }
  }, {
    maxWait: 20000,
    timeout: 120000,
  });

  const [products, variants, slugs, skus] = await Promise.all([
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.product.groupBy({ by: ['slug'] }),
    prisma.productVariant.groupBy({ by: ['sku'] }),
  ]);
  if (products !== EXPECTED_PRODUCTS || variants !== EXPECTED_VARIANTS || slugs.length !== EXPECTED_PRODUCTS || skus.length !== EXPECTED_VARIANTS) {
    throw new Error('Catalog seed verification failed.');
  }
  process.stdout.write(
    `Seeded ${products} products and ${variants} variants with ${slugs.length} unique slugs and ${skus.length} unique SKUs.\n`,
  );
}

seedDatabase()
  .catch(error => {
    process.stderr.write(
      `Database seed failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => disconnectDatabase());
