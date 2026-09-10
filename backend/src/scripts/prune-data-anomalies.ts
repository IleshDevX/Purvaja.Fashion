import { getPrismaClient } from '../config/database.js';
import { logger } from '../utils/logger.js';

export async function pruneDataAnomalies() {
  const prisma = getPrismaClient();

  logger.info('Starting data anomaly pruning...');

  // 1. Identify and delete orphaned checkout idempotency rows
  // Those where order_id or payment_id is null, or order/payment does not exist, or order_id mismatches payment.order_id
  const orphanedIdempotencyRows = await prisma.$queryRaw<Array<{ id: string; key: string }>>`
    SELECT ci.id, ci.key
    FROM checkout_idempotency ci
    LEFT JOIN orders o ON o.id = ci.order_id
    LEFT JOIN payments p ON p.id = ci.payment_id
    WHERE ci.order_id IS NULL 
       OR ci.payment_id IS NULL 
       OR o.id IS NULL 
       OR p.id IS NULL 
       OR p.order_id <> ci.order_id
  `;

  logger.info({ count: orphanedIdempotencyRows.length }, 'Found orphaned checkout idempotency records');

  if (orphanedIdempotencyRows.length > 0) {
    const ids = orphanedIdempotencyRows.map(r => r.id);
    const deleteResult = await prisma.$executeRaw`
      DELETE FROM checkout_idempotency
      WHERE id = ANY(${ids}::uuid[])
    `;
    logger.info({ deletedCount: deleteResult }, 'Deleted orphaned checkout idempotency records');
  }

  // 2. Identify and delete orders with 0 order items (synthetic test orders)
  const zeroItemOrders = await prisma.$queryRaw<Array<{ id: string; order_number: string }>>`
    SELECT o.id, o.order_number
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE oi.id IS NULL
  `;

  logger.info({ count: zeroItemOrders.length }, 'Found zero-item orders');

  if (zeroItemOrders.length > 0) {
    for (const order of zeroItemOrders) {
      // Clean up any dependent records first (payments, reservations, etc.)
      await prisma.$transaction(async tx => {
        await tx.$executeRaw`DELETE FROM checkout_idempotency WHERE order_id = ${order.id}::uuid`;
        await tx.$executeRaw`DELETE FROM inventory_reservations WHERE order_id = ${order.id}::uuid`;
        await tx.$executeRaw`DELETE FROM payment_observations WHERE payment_id IN (SELECT id FROM payments WHERE order_id = ${order.id}::uuid)`;
        await tx.$executeRaw`DELETE FROM payment_initiations WHERE payment_id IN (SELECT id FROM payments WHERE order_id = ${order.id}::uuid)`;
        await tx.$executeRaw`DELETE FROM payment_refunds WHERE payment_id IN (SELECT id FROM payments WHERE order_id = ${order.id}::uuid)`;
        await tx.$executeRaw`DELETE FROM payments WHERE order_id = ${order.id}::uuid`;
        await tx.$executeRaw`DELETE FROM coupon_redemptions WHERE order_id = ${order.id}::uuid`;
        await tx.$executeRaw`DELETE FROM order_returns WHERE order_id = ${order.id}::uuid`;
        await tx.$executeRaw`DELETE FROM orders WHERE id = ${order.id}::uuid`;
      });
      logger.info({ orderNumber: order.order_number }, 'Pruned zero-item order and associations');
    }
  }

  logger.info('Anomaly pruning completed successfully.');
}

if (process.argv[1] && process.argv[1].includes('prune-data-anomalies')) {
  pruneDataAnomalies()
    .then(() => process.exit(0))
    .catch(err => {
      logger.error({ err }, 'Prune data anomalies failed');
      process.exit(1);
    });
}
