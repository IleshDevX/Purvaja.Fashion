import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { getPrismaClient } from '../../src/config/database.js';
import { runDataConsistencyChecks } from '../../src/scripts/check-data-consistency.js';
import { ProductService } from '../../src/services/product.service.js';
import { parseProductListQuery } from '../../src/validators/product.validator.js';

describe('Phase 6 — exact contracts and invariant detection', () => {
  const prisma = getPrismaClient();
  const userId = randomUUID();
  const orderIds = Array.from({ length: 21 }, () => randomUUID());
  const idempotencyId = randomUUID();
  let productSnapshot: { id: string; rating: number; reviewCount: number } | undefined;

  afterAll(async () => {
    await prisma.checkoutIdempotency.deleteMany({ where: { id: idempotencyId } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    if (productSnapshot) {
      await prisma.product.update({
        where: { id: productSnapshot.id },
        data: { rating: productSnapshot.rating, reviewCount: productSnapshot.reviewCount },
      });
    }
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it('publishes canonical integer-paise product and selected-variant prices', async () => {
    const result = await new ProductService().list(parseProductListQuery({ limit: 1 }));
    expect(result.items).toHaveLength(1);
    const product = result.items[0]!;
    expect(Number.isInteger(product.pricePaise)).toBe(true);
    expect(product.price).toBe(product.pricePaise / 100);
    for (const variant of product.variants) {
      expect(Number.isInteger(variant.pricePaise)).toBe(true);
      expect(variant.price).toBe(variant.pricePaise / 100);
    }
  });

  it('reports exact anomaly totals while bounding samples and detects every Phase 6 invariant class', async () => {
    const before = await runDataConsistencyChecks();
    const beforeCount = (code: string) => before.checks.find(check => check.code === code)?.anomalyCount ?? 0;

    await prisma.user.create({ data: { id: userId, email: `phase6-${userId}@example.test`, passwordHash: 'test-only-hash' } });
    await prisma.order.createMany({
      data: orderIds.map((id, index) => ({
        id,
        orderNumber: `PF-P6-${userId.slice(0, 8)}-${index}`,
        userId,
        shippingAddress: {},
        subtotalPaise: 101,
        discountPaise: 0,
        shippingChargePaise: 0,
        taxPaise: 0,
        totalPaise: 101,
      })),
    });
    await prisma.checkoutIdempotency.create({
      data: {
        id: idempotencyId,
        key: `phase6-${idempotencyId}`,
        userId,
        requestHash: 'a'.repeat(64),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const product = await prisma.product.findFirstOrThrow({ select: { id: true, rating: true, reviewCount: true } });
    productSnapshot = { ...product, rating: Number(product.rating) };
    await prisma.product.update({ where: { id: product.id }, data: { rating: 4.1, reviewCount: 2 } });

    const report = await runDataConsistencyChecks();
    const financial = report.checks.find(check => check.code === 'ORDER_FINANCIAL_INVARIANT')!;
    const review = report.checks.find(check => check.code === 'PRODUCT_REVIEW_AGGREGATE_MISMATCH')!;
    const idempotency = report.checks.find(check => check.code === 'CHECKOUT_IDEMPOTENCY_ASSOCIATION_MISMATCH')!;

    expect(financial.status).toBe('FAIL');
    expect(financial.anomalyCount - beforeCount(financial.code)).toBe(21);
    expect(financial.samples).toHaveLength(20);
    expect(review.status).toBe('FAIL');
    expect(review.anomalyCount).toBeGreaterThan(beforeCount(review.code));
    expect(idempotency.status).toBe('FAIL');
    expect(idempotency.anomalyCount).toBeGreaterThan(beforeCount(idempotency.code));
  });
});
