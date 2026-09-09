import argon2 from 'argon2';
import { getPrismaClient, disconnectDatabase } from '../src/config/database.js';
import { PRODUCT_SEED } from '../src/seeds/products.seed.js';
import { getSeedAdminCredentials } from '../src/config/seed-admin.js';

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
    // Seed metrics describe the editorial catalogue fixture. Customer review
    // aggregates use database defaults on create and remain untouched on
    // reseed because they are derived exclusively from published Review rows.
    editorialRating: product.rating,
    editorialReviewCount: product.reviewCount,
    isFeatured: product.isFeatured ?? false,
    isNewArrival: product.isNewArrival ?? false,
    isDeal: product.isDeal ?? false,
    metadata: { legacyProductId: product.id, colors: product.colors, sizes: product.sizes },
  };
}

export async function seedDatabase(): Promise<void> {
  const { email: adminEmail, password: adminPassword } = getSeedAdminCredentials();
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new Error('PRODUCTION SAFEGUARD: Database seeding is strictly prohibited in production (NODE_ENV=production).');
  }

  const prisma = getPrismaClient();
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingAdmin && (existingAdmin.role !== 'ADMIN' || existingAdmin.status !== 'ACTIVE')) {
    throw new Error('Seed administrator email belongs to an existing non-admin or inactive account. Use the explicit account-management workflow.');
  }
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

  const passwordHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      firstName: 'Admin',
      lastName: 'Purvaja',
      phone: '+919999999999',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
    update: {},
  });
  process.stdout.write(`Seeded administrator account: ${admin.email}\n`);
}

seedDatabase()
  .catch(error => {
    process.stderr.write(
      `Database seed failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => disconnectDatabase());
