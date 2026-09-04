import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { getPrismaClient } from '../../src/config/database.js';
import { CSRF_COOKIE } from '../../src/utils/auth.js';

const prisma = getPrismaClient();
const userEmail = `cart-user-${randomUUID()}@example.invalid`;
const otherEmail = `cart-other-${randomUUID()}@example.invalid`;
let userId = '';
let otherUserId = '';
let variantId = '';
let agent: ReturnType<typeof request.agent>;
let otherAgent: ReturnType<typeof request.agent>;
let csrf = '';
let otherCsrf = '';

beforeAll(async () => {
  const variant = await prisma.productVariant.findFirstOrThrow({
    where: { status: 'ACTIVE', stockQuantity: { gte: 10 }, product: { status: 'ACTIVE' } },
  });
  variantId = variant.id;

  const [user, otherUser] = await Promise.all([
    prisma.user.create({ data: { email: userEmail, passwordHash: await argon2.hash('SecurePassword123'), emailVerifiedAt: new Date() } }),
    prisma.user.create({ data: { email: otherEmail, passwordHash: await argon2.hash('SecurePassword123'), emailVerifiedAt: new Date() } }),
  ]);
  userId = user.id;
  otherUserId = otherUser.id;

  agent = request.agent(app);
  const loginRes = await agent.post('/api/v1/auth/login').send({ email: userEmail, password: 'SecurePassword123' });
  const cookies = (loginRes.headers['set-cookie'] as unknown as string[]) || [];
  csrf = cookies.find(c => c.startsWith(`${CSRF_COOKIE}=`))!.split(';')[0]!.split('=')[1]!;

  otherAgent = request.agent(app);
  const otherLoginRes = await otherAgent.post('/api/v1/auth/login').send({ email: otherEmail, password: 'SecurePassword123' });
  const otherCookies = (otherLoginRes.headers['set-cookie'] as unknown as string[]) || [];
  otherCsrf = otherCookies.find(c => c.startsWith(`${CSRF_COOKIE}=`))!.split(';')[0]!.split('=')[1]!;
});

afterAll(async () => {
  const ids = [userId, otherUserId].filter(Boolean);
  if (ids.length > 0) {
    await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: ids } } } });
    await prisma.cart.deleteMany({ where: { userId: { in: ids } } });
    await prisma.session.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
});

describe('cart APIs', () => {
  let createdCartItemId = '';

  it('enforces authentication on cart endpoints', async () => {
    expect((await request(app).get('/api/v1/cart')).status).toBe(401);
    expect((await request(app).post('/api/v1/cart/items').send({ variantId, quantity: 1 })).status).toBe(401);
  });

  it('retrieves an empty cart for a newly registered user', async () => {
    const res = await agent.get('/api/v1/cart');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      items: [],
    });
  });

  it('adds a product variant to the cart and calculates item pricing', async () => {
    const res = await agent
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', csrf)
      .send({ variantId, quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    const item = res.body.data.items[0];
    expect(item.variantId).toBe(variantId);
    expect(item.quantity).toBe(2);
    expect(item.pricePaise).toBeGreaterThan(0);
    expect(item.product).toBeDefined();
    createdCartItemId = item.id;
  });

  it('updates the quantity of an existing cart item', async () => {
    const res = await agent
      .patch(`/api/v1/cart/items/${createdCartItemId}`)
      .set('X-CSRF-Token', csrf)
      .send({ quantity: 3 });
    expect(res.status).toBe(200);
    const item = res.body.data.items.find((i: { id: string }) => i.id === createdCartItemId);
    expect(item.quantity).toBe(3);
  });

  it('rejects adding unavailable stock exceeding inventory threshold', async () => {
    // Temporarily limit stock to 1 to test INSUFFICIENT_STOCK with valid quantity (5 <= 20)
    await prisma.productVariant.update({ where: { id: variantId }, data: { stockQuantity: 1 } });
    const res = await agent
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', csrf)
      .send({ variantId, quantity: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    // Restore stock
    await prisma.productVariant.update({ where: { id: variantId }, data: { stockQuantity: 50 } });
  });

  it('rejects nonexistent variant IDs with 404', async () => {
    const res = await agent
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', csrf)
      .send({ variantId: randomUUID(), quantity: 1 });
    expect(res.status).toBe(404);
  });

  it('enforces cart isolation across different customer accounts', async () => {
    // otherAgent cannot modify createdCartItemId from the first agent's cart
    const res = await otherAgent
      .patch(`/api/v1/cart/items/${createdCartItemId}`)
      .set('X-CSRF-Token', otherCsrf)
      .send({ quantity: 1 });
    expect(res.status).toBe(404);

    // otherAgent's cart remains completely empty
    const otherCart = await otherAgent.get('/api/v1/cart');
    expect(otherCart.status).toBe(200);
    expect(otherCart.body.data.items).toHaveLength(0);
  });

  it('removes an item from the cart', async () => {
    const res = await agent
      .delete(`/api/v1/cart/items/${createdCartItemId}`)
      .set('X-CSRF-Token', csrf);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
  });
});
