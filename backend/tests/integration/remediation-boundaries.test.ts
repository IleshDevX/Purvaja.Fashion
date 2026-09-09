import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPrismaClient, disconnectDatabase } from '../../src/config/database.js';
import { changeStock } from '../../src/services/inventory.service.js';
import { CartService } from '../../src/services/cart.service.js';
import { CommerceService } from '../../src/services/commerce.service.js';
import { AdminService } from '../../src/services/admin.service.js';
import { ProviderInitiationError, type PaymentProviderAdapter } from '../../src/services/payment-provider.service.js';

// tests/setup.ts refuses the ordinary application's connection. This suite
// must be executed against a freshly migrated disposable TEST_DATABASE_URL.
const prisma = getPrismaClient();
let userId = '';
let productId = '';
let variantId = '';
const carts = new CartService();
const commerce = new CommerceService();
const admin = new AdminService();
const shippingAddress = { recipientName: 'Fixture Buyer', phone: '9876543210', line1: 'Fixture Road', city: 'Surat', state: 'Gujarat', postalCode: '395006', country: 'IN' };

beforeAll(async () => {
  const user = await prisma.user.create({ data: { email: `remediation-${randomUUID()}@example.invalid`, passwordHash: 'not-an-authentication-fixture' } });
  userId = user.id;
  const product = await prisma.product.create({ data: {
    name: 'Isolated stock fixture', slug: `stock-${randomUUID()}`, description: 'Isolated concurrency fixture', basePricePaise: 10049, status: 'ACTIVE',
    variants: { create: { sku: randomUUID(), size: '40 (M)', colorName: 'Blue', colorHex: '#0000ff', stockQuantity: 2, status: 'ACTIVE' } },
  }, include: { variants: true } });
  productId = product.id;
  variantId = product.variants[0]!.id;
});

afterAll(async () => {
  // Cleanup only records owned by this fixture, never shared catalogue data.
  if (userId) {
    const orders = await prisma.order.findMany({ where: { userId }, select: { id: true } });
    const ids = orders.map(order => order.id);
    await prisma.checkoutIdempotency.deleteMany({ where: { userId } });
    await prisma.couponRedemption.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.inventoryReservation.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.payment.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.order.deleteMany({ where: { id: { in: ids } } });
    await prisma.cartItem.deleteMany({ where: { cart: { userId } } });
    await prisma.cart.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  }
  if (variantId) {
    await prisma.inventoryMovement.deleteMany({ where: { variantId } });
    await prisma.productVariant.delete({ where: { id: variantId } });
  }
  if (productId) await prisma.product.delete({ where: { id: productId } });
  await disconnectDatabase();
});

describe('durable commerce regression boundaries', () => {
  it('allows exactly two of three simultaneous decrements from stock=2', async () => {
    const results = await Promise.allSettled(Array.from({ length: 3 }, () => prisma.$transaction(tx => changeStock(tx, variantId, { delta: -1 }, {
      type: 'SALE', reason: 'Isolated stock contention', referenceType: 'TEST',
    }))));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(2);
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockQuantity).toBe(0);
    const moves = await prisma.inventoryMovement.findMany({ where: { variantId } });
    expect(moves.map(move => [move.previousQuantity, move.resultingQuantity]).sort()).toEqual([[1, 0], [2, 1]]);
  });

  it('does not lose simultaneous restocks', async () => {
    await Promise.all(Array.from({ length: 3 }, () => prisma.$transaction(tx => changeStock(tx, variantId, { delta: 1 }, {
      type: 'RESTOCK', reason: 'Isolated restock contention', referenceType: 'TEST',
    }))));
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockQuantity).toBe(3);
  });

  it('treats setting the current stock as a successful no-op without a false ledger entry', async () => {
    const before = await prisma.inventoryMovement.count({ where: { variantId } });
    const result = await prisma.$transaction(tx => changeStock(tx, variantId, { target: 3 }, {
      type: 'CORRECTION', reason: 'Idempotent stock reconciliation', referenceType: 'TEST',
    }));
    expect(result.delta).toBe(0);
    expect(await prisma.inventoryMovement.count({ where: { variantId } })).toBe(before);
  });

  it('applies concurrent guest-merge retries once and rejects a changed payload', async () => {
    const id = randomUUID();
    await Promise.all([carts.merge(userId, id, [{ variantId, quantity: 1 }]), carts.merge(userId, id, [{ variantId, quantity: 1 }])]);
    expect((await carts.get(userId)).items[0]!.quantity).toBe(1);
    await expect(carts.merge(userId, id, [{ variantId, quantity: 2 }])).rejects.toMatchObject({ code: 'CART_MERGE_CONFLICT' });
    expect((await carts.get(userId)).items[0]!.quantity).toBe(1);
  });

  it('rejects a stale customer-reviewed price without reserving inventory', async () => {
    const beforeStock = (await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockQuantity;
    const beforeOrders = await prisma.order.count({ where: { userId } });
    await prisma.product.update({ where: { id: productId }, data: { basePricePaise: 11049 } });
    await expect(commerce.checkout(userId, {
      shippingAddress,
      deliveryOptionId: 'standard',
      cartSnapshot: [{ variantId, quantity: 1, unitPricePaise: 10049 }],
    }, randomUUID())).rejects.toMatchObject({ code: 'CART_SNAPSHOT_CHANGED' });
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockQuantity).toBe(beforeStock);
    expect(await prisma.order.count({ where: { userId } })).toBe(beforeOrders);
    expect(await prisma.inventoryReservation.count({ where: { variantId, status: 'ACTIVE' } })).toBe(0);
  });

  it('replays checkout after payment success clears the purchased cart items', async () => {
    const key = randomUUID();
    const input = {
      shippingAddress,
      deliveryOptionId: 'standard' as const,
      cartSnapshot: [{ variantId, quantity: 1, unitPricePaise: 11049 }],
    };
    const session = await commerce.checkout(userId, input, key);
    await commerce.complete(userId, session.paymentId, 'SUCCESS');
    expect((await carts.get(userId)).items).toHaveLength(0);
    const replay = await commerce.checkout(userId, input, key);
    expect(replay.paymentId).toBe(session.paymentId);
    expect(replay.paymentStatus).toBe('SUCCESS');
    expect(await prisma.order.count({ where: { userId } })).toBe(1);
    await prisma.order.update({ where: { id: session.orderId }, data: { status: 'SHIPPED' } });
    expect((await commerce.complete(userId, session.paymentId, 'SUCCESS')).paymentStatus).toBe('SUCCESS');
  });

  it('reconciles a checkout, admin restock and reservation release through one stock ledger', async () => {
    await prisma.$transaction(tx => changeStock(tx, variantId, { target: 5 }, {
      type: 'CORRECTION', reason: 'Prepare mixed-writer contention', referenceType: 'TEST',
    }));
    await carts.add(userId, variantId, 1);

    const results = await Promise.allSettled([
      commerce.checkout(userId, {
        shippingAddress,
        deliveryOptionId: 'standard',
        cartSnapshot: [{ variantId, quantity: 1, unitPricePaise: 11049 }],
      }, randomUUID()),
      admin.adjust(userId, {
        variantId,
        quantity: 2,
        type: 'RESTOCK',
        reason: 'Concurrent warehouse receipt',
      }),
    ]);
    expect(results.every(result => result.status === 'fulfilled')).toBe(true);
    const session = (results[0] as PromiseFulfilledResult<Awaited<ReturnType<CommerceService['checkout']>>>).value;

    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockQuantity).toBe(6);
    await commerce.complete(userId, session.paymentId, 'FAILED');
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockQuantity).toBe(7);

    const movements = await prisma.inventoryMovement.findMany({
      where: { variantId },
      orderBy: { createdAt: 'asc' },
    });
    const mixed = movements.filter(movement =>
      movement.reason === 'Concurrent warehouse receipt' ||
      movement.referenceId === session.orderId,
    );
    expect(mixed).toHaveLength(3);
    expect(mixed.some(movement => movement.type === 'SALE')).toBe(true);
    expect(mixed.some(movement => movement.type === 'RESTOCK' && movement.referenceType === 'ADMIN_ADJUSTMENT')).toBe(true);
    expect(mixed.some(movement => movement.type === 'CANCELLATION')).toBe(true);
  });

  it('preserves the committed checkout association when provider initiation has an unknown outcome', async () => {
    await carts.clear(userId);
    await carts.add(userId, variantId, 1);
    const key = randomUUID();
    let providerCalls = 0;
    const unknownProvider: PaymentProviderAdapter = {
      async initiate() {
        providerCalls += 1;
        throw new ProviderInitiationError('Connection ended without a response.', 'PROVIDER_RESPONSE_LOST', 'UNKNOWN');
      },
    };
    const service = new CommerceService(undefined, () => unknownProvider);
    const input = {
      shippingAddress,
      deliveryOptionId: 'standard' as const,
      cartSnapshot: [{ variantId, quantity: 1, unitPricePaise: 11049 }],
    };

    await expect(service.checkout(userId, input, key)).rejects.toMatchObject({ code: 'PROVIDER_RESPONSE_LOST' });
    const committed = await prisma.checkoutIdempotency.findUniqueOrThrow({ where: { key } });
    expect(committed.orderId).toBeTruthy();
    expect(committed.paymentId).toBeTruthy();
    expect(await prisma.inventoryReservation.count({ where: { orderId: committed.orderId!, status: 'ACTIVE' } })).toBe(1);
    expect(await prisma.paymentInitiation.findUnique({ where: { paymentId: committed.paymentId! } }))
      .toMatchObject({ state: 'UNKNOWN', attemptCount: 1 });

    const replay = await service.checkout(userId, input, key);
    expect(replay).toMatchObject({ orderId: committed.orderId, paymentId: committed.paymentId, initiationStatus: 'UNKNOWN' });
    expect(providerCalls).toBe(1);
  });
});
