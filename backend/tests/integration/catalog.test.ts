import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { disconnectDatabase, getPrismaClient } from '../../src/config/database.js';

type Product = { id: string; slug: string; price: number; rating: number; sizes: string[]; colors: Array<{ name: string }>; fit: string };
const testUserIds: string[] = [];

afterAll(async () => {
  if (testUserIds.length) {
    await getPrismaClient().review.deleteMany({ where: { userId: { in: testUserIds } } });
    await getPrismaClient().user.deleteMany({ where: { id: { in: testUserIds } } });
  }
  await disconnectDatabase();
});

describe('public catalog API', () => {
  it('lists seeded products with bounded pagination and public fields only', async () => {
    const response = await request(app).get('/api/v1/products');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({ page: 1, limit: 24, total: 50, totalPages: 3 });
    expect(response.body.data.items).toHaveLength(24);
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|tokenHash|emailVerifiedAt|session/i);
  });

  it('applies server-side filters, search, sorting, and custom pagination', async () => {
    const initial = await request(app).get('/api/v1/products?limit=1');
    const product = initial.body.data.items[0] as Product;
    const params = new URLSearchParams({
      page: '1', limit: '10', category: 'shirts', size: product.sizes[0]!, color: product.colors[0]!.name,
      fit: product.fit, minPrice: '0', maxPrice: String(product.price), minRating: '0', search: product.name.split(' ')[0]!, sort: 'price-asc',
    });
    const response = await request(app).get(`/api/v1/products?${params}`);
    expect(response.status).toBe(200);
    expect(response.body.data.items.some((item: Product) => item.id === product.id)).toBe(true);
    expect(response.body.data.items.every((item: Product) => item.price <= product.price)).toBe(true);
    expect(response.body.data.items.every((item: Product, index: number, items: Product[]) => index === 0 || items[index - 1]!.price <= item.price)).toBe(true);

    const ratingResponse = await request(app).get(`/api/v1/products?minRating=${product.rating}`);
    expect(ratingResponse.body.data.items.every((item: Product) => item.rating >= product.rating)).toBe(true);
  });

  it('rejects invalid bounded-pagination and price inputs', async () => {
    const [limit, range] = await Promise.all([
      request(app).get('/api/v1/products?limit=101'),
      request(app).get('/api/v1/products?minPrice=1000&maxPrice=100'),
    ]);
    expect(limit.status).toBe(400);
    expect(range.status).toBe(400);
  });

  it('returns product details for both a slug and UUID and rejects malformed or unknown identifiers', async () => {
    const list = await request(app).get('/api/v1/products?limit=1');
    const product = list.body.data.items[0] as Product;
    const [bySlug, byId, malformed, missing] = await Promise.all([
      request(app).get(`/api/v1/products/${product.slug}`),
      request(app).get(`/api/v1/products/${product.id}`),
      request(app).get('/api/v1/products/not a slug'),
      request(app).get('/api/v1/products/00000000-0000-4000-8000-000000000000'),
    ]);
    expect(bySlug.status).toBe(200);
    expect(bySlug.body.data.product.variants.length).toBeGreaterThan(0);
    expect(bySlug.body.data.product.images.length).toBeGreaterThan(0);
    expect(byId.body.data.product.id).toBe(product.id);
    expect(malformed.status).toBe(400);
    expect(missing.status).toBe(404);
  });

  it('returns only published reviews with public fields, pagination, and a 404 for unknown products', async () => {
    const list = await request(app).get('/api/v1/products?limit=1');
    const product = list.body.data.items[0] as Product;
    const publishedUserId = crypto.randomUUID();
    const pendingUserId = crypto.randomUUID();
    testUserIds.push(publishedUserId, pendingUserId);
    const prisma = getPrismaClient();
    await prisma.user.createMany({ data: [
      { id: publishedUserId, email: `catalog-test-${publishedUserId}@example.invalid`, passwordHash: 'test-only-not-a-password' },
      { id: pendingUserId, email: `catalog-test-${pendingUserId}@example.invalid`, passwordHash: 'test-only-not-a-password' },
    ] });
    await prisma.review.createMany({ data: [
      { userId: publishedUserId, productId: product.id, rating: 5, title: 'Published', content: 'Visible review', status: 'PUBLISHED' },
      { userId: pendingUserId, productId: product.id, rating: 1, title: 'Pending', content: 'Private review', status: 'PENDING' },
    ], skipDuplicates: true });
    const [reviews, missing] = await Promise.all([
      request(app).get(`/api/v1/products/${product.id}/reviews?page=1&limit=10`),
      request(app).get('/api/v1/products/00000000-0000-4000-8000-000000000000/reviews'),
    ]);
    expect(reviews.status).toBe(200);
    expect(reviews.body.data).toMatchObject({ page: 1, limit: 10 });
    expect(JSON.stringify(reviews.body.data.items)).not.toMatch(/email|password|token|session/i);
    expect(reviews.body.data.items.some((review: { title: string }) => review.title === 'Published')).toBe(true);
    expect(reviews.body.data.items.some((review: { title: string }) => review.title === 'Pending')).toBe(false);
    expect(missing.status).toBe(404);
  });
});
