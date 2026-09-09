import { fileURLToPath } from 'node:url';
import { getPrismaClient } from '../config/database.js';
import { operationalAlerts } from '../services/operational-alert.service.js';
import type { Prisma } from '../generated/prisma/client.js';

export interface ConsistencyCheckSample {
  id: string;
  [key: string]: unknown;
}

export interface ConsistencyCheckResult {
  code: string;
  name: string;
  status: 'PASS' | 'FAIL';
  anomalyCount: number;
  details: string;
  samples: ConsistencyCheckSample[];
}

export interface ConsistencyReport {
  timestamp: string;
  success: boolean;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  totalAnomalies: number;
  checks: ConsistencyCheckResult[];
}

/**
 * Runs read-only consistency checks against the production/staging database
 * to detect state corruptions, race-condition remnants, or orphaned records.
 * NEVER mutates or deletes data.
 */
export async function runDataConsistencyChecks(): Promise<ConsistencyReport> {
  const prisma = getPrismaClient();
  const checks: ConsistencyCheckResult[] = [];
  const now = new Date();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // ---------------------------------------------------------------------------
  // Check 1: Paid Orders with Expired Reservations
  // ---------------------------------------------------------------------------
  const paidReservationWhere = {
    paymentStatus: { in: ['PAID', 'SUCCESS'] },
    inventoryReservations: { some: { status: 'EXPIRED' as const } },
  } satisfies Prisma.OrderWhereInput;
  const [paidReservationCount, paidWithContradictoryReservations] = await Promise.all([prisma.order.count({ where: paidReservationWhere }), prisma.order.findMany({
    where: {
      paymentStatus: { in: ['PAID', 'SUCCESS'] },
      inventoryReservations: {
        some: {
          status: 'EXPIRED',
        },
      },
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      inventoryReservations: {
        where: { status: 'EXPIRED' },
        select: { id: true, status: true, quantity: true, expiresAt: true },
      },
    },
    take: 20,
  })]);

  checks.push({
    code: 'PAID_ORDER_EXPIRED_RESERVATION',
    name: 'Paid Orders with Expired Reservations',
    status: paidReservationCount === 0 ? 'PASS' : 'FAIL',
    anomalyCount: paidReservationCount,
    details:
      paidReservationCount === 0
        ? 'No paid orders hold contradictory expired reservations.'
        : `Found ${paidReservationCount} paid orders with expired reservations; showing up to 20.`,
    samples: paidWithContradictoryReservations.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      expiredReservationIds: o.inventoryReservations.map(r => r.id),
    })),
  });

  // ---------------------------------------------------------------------------
  // Check 2: Cancelled Orders with Active Reservations
  // ---------------------------------------------------------------------------
  const cancelledReservationWhere = { status: 'CANCELLED' as const, inventoryReservations: { some: { status: 'ACTIVE' as const } } };
  const [cancelledReservationCount, cancelledWithActiveReservations] = await Promise.all([prisma.order.count({ where: cancelledReservationWhere }), prisma.order.findMany({
    where: {
      status: 'CANCELLED',
      inventoryReservations: {
        some: {
          status: 'ACTIVE',
        },
      },
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      inventoryReservations: {
        where: { status: 'ACTIVE' },
        select: { id: true, quantity: true, expiresAt: true },
      },
    },
    take: 20,
  })]);

  checks.push({
    code: 'CANCELLED_ORDER_ACTIVE_RESERVATION',
    name: 'Cancelled Orders with Active Reservations',
    status: cancelledReservationCount === 0 ? 'PASS' : 'FAIL',
    anomalyCount: cancelledReservationCount,
    details:
      cancelledReservationCount === 0
        ? 'No cancelled orders hold active reservations.'
        : `Found ${cancelledReservationCount} cancelled orders retaining active reservations; showing up to 20.`,
    samples: cancelledWithActiveReservations.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      activeReservations: o.inventoryReservations,
    })),
  });

  // ---------------------------------------------------------------------------
  // Check 3: Duplicate Inventory Movements
  // ---------------------------------------------------------------------------
  const duplicateMovements = await prisma.$queryRaw<
    Array<{
      variant_id: string;
      reference_id: string | null;
      reason: string | null;
      type: string;
      quantity: number;
      cnt: bigint;
      total_count: bigint;
    }>
  >`
    WITH anomalies AS (
      SELECT "variant_id", "reference_id", MIN("reason") AS reason, "type", MIN("quantity") AS quantity, COUNT(*) as cnt
      FROM "inventory_movements"
      WHERE "reference_id" IS NOT NULL
      GROUP BY "variant_id", "reference_id", "type"
      HAVING COUNT(*) > 1
    )
    SELECT *, COUNT(*) OVER() AS total_count FROM anomalies
    LIMIT 20
  `;
  const duplicateMovementCount = Number(duplicateMovements[0]?.total_count ?? 0);

  checks.push({
    code: 'DUPLICATE_INVENTORY_MOVEMENTS',
    name: 'Duplicate Inventory Movements',
    status: duplicateMovementCount === 0 ? 'PASS' : 'FAIL',
    anomalyCount: duplicateMovementCount,
    details:
      duplicateMovementCount === 0
        ? 'Zero duplicate inventory movements detected.'
        : `Found ${duplicateMovementCount} groups of duplicate inventory movements; showing up to 20.`,
    samples: duplicateMovements.map(m => ({
      id: `${m.variant_id}:${m.reference_id}`,
      variantId: m.variant_id,
      referenceId: m.reference_id,
      reason: m.reason,
      type: m.type,
      quantity: m.quantity,
      duplicateCount: Number(m.cnt),
    })),
  });

  // ---------------------------------------------------------------------------
  // Check 4: Negative Stock Quantities
  // ---------------------------------------------------------------------------
  const [negativeStockCount, negativeStockVariants] = await Promise.all([prisma.productVariant.count({ where: { stockQuantity: { lt: 0 } } }), prisma.productVariant.findMany({
    where: {
      stockQuantity: { lt: 0 },
    },
    select: {
      id: true,
      sku: true,
      stockQuantity: true,
      productId: true,
    },
    take: 20,
  })]);

  checks.push({
    code: 'NEGATIVE_STOCK_QUANTITY',
    name: 'Negative Stock Quantities',
    status: negativeStockCount === 0 ? 'PASS' : 'FAIL',
    anomalyCount: negativeStockCount,
    details:
      negativeStockCount === 0
        ? 'All product variant stock quantities are non-negative.'
        : `Found ${negativeStockCount} variants with negative inventory; showing up to 20.`,
    samples: negativeStockVariants.map(v => ({
      id: v.id,
      sku: v.sku,
      stockQuantity: v.stockQuantity,
      productId: v.productId,
    })),
  });

  // ---------------------------------------------------------------------------
  // Check 5: Orphaned or Inconsistent Coupon Redemptions
  // ---------------------------------------------------------------------------
  const invalidRedemptionWhere = { order: { OR: [
    { status: 'CANCELLED' as const },
    { paymentStatus: { in: ['FAILED', 'EXPIRED', 'CANCELLED'] } },
  ] } } satisfies Prisma.CouponRedemptionWhereInput;
  const [invalidRedemptionCount, invalidRedemptions] = await Promise.all([prisma.couponRedemption.count({ where: invalidRedemptionWhere }), prisma.couponRedemption.findMany({
    where: {
      order: {
        OR: [
          { status: 'CANCELLED' },
          { paymentStatus: { in: ['FAILED', 'EXPIRED', 'CANCELLED'] } },
        ],
      },
    },
    select: {
      id: true,
      couponId: true,
      userId: true,
      orderId: true,
      order: {
        select: { status: true, paymentStatus: true },
      },
    },
    take: 20,
  })]);

  checks.push({
    code: 'ORPHANED_COUPON_REDEMPTIONS',
    name: 'Coupon Redemptions on Failed/Cancelled Orders',
    status: invalidRedemptionCount === 0 ? 'PASS' : 'FAIL',
    anomalyCount: invalidRedemptionCount,
    details:
      invalidRedemptionCount === 0
        ? 'No coupon redemptions exist on failed or cancelled orders.'
        : `Found ${invalidRedemptionCount} coupon redemptions tied to failed/cancelled orders; showing up to 20.`,
    samples: invalidRedemptions.map(r => ({
      id: r.id,
      couponId: r.couponId,
      userId: r.userId,
      orderId: r.orderId,
      orderStatus: r.order?.status,
      paymentStatus: r.order?.paymentStatus,
    })),
  });

  // ---------------------------------------------------------------------------
  // Check 6: Orphaned Payments Without Valid Orders
  // ---------------------------------------------------------------------------
  const orphanedPayments = await prisma.$queryRaw<
    Array<{
      id: string;
      provider: string;
      status: string;
      amount_paise: number;
      total_count: bigint;
    }>
  >`
    WITH anomalies AS (
      SELECT p.id, p.provider, p.status, p.amount_paise
      FROM "payments" p
      LEFT JOIN "orders" o ON o.id = p.order_id
      WHERE o.id IS NULL
    )
    SELECT *, COUNT(*) OVER() AS total_count FROM anomalies
    LIMIT 20
  `;
  const orphanedPaymentCount = Number(orphanedPayments[0]?.total_count ?? 0);

  checks.push({
    code: 'PAYMENTS_WITHOUT_ORDER',
    name: 'Payments Without Valid Orders',
    status: orphanedPaymentCount === 0 ? 'PASS' : 'FAIL',
    anomalyCount: orphanedPaymentCount,
    details:
      orphanedPaymentCount === 0
        ? 'All payment records have associated order records.'
        : `Found ${orphanedPaymentCount} orphaned payment records without orders; showing up to 20.`,
    samples: orphanedPayments.map(p => ({
      id: p.id,
      provider: p.provider,
      status: p.status,
      amountPaise: p.amount_paise,
    })),
  });

  // ---------------------------------------------------------------------------
  // Check 7: Excessive or Contradictory Returns
  // ---------------------------------------------------------------------------
  const excessiveReturns = await prisma.$queryRaw<
    Array<{
      order_item_id: string;
      purchased_qty: number;
      returned_qty: bigint;
      total_count: bigint;
    }>
  >`
    WITH anomalies AS (
      SELECT oi.id as order_item_id, oi.quantity as purchased_qty, SUM(ri.quantity) as returned_qty
      FROM "order_items" oi
      INNER JOIN "order_return_items" ri ON ri.order_item_id = oi.id
      INNER JOIN "order_returns" r ON r.id = ri.return_id
      WHERE r.status != 'REJECTED'
      GROUP BY oi.id, oi.quantity
      HAVING SUM(ri.quantity) > oi.quantity
    )
    SELECT *, COUNT(*) OVER() AS total_count FROM anomalies
    LIMIT 20
  `;
  const excessiveReturnCount = Number(excessiveReturns[0]?.total_count ?? 0);

  checks.push({
    code: 'EXCESSIVE_ORDER_RETURNS',
    name: 'Returns Exceeding Purchased Quantity',
    status: excessiveReturnCount === 0 ? 'PASS' : 'FAIL',
    anomalyCount: excessiveReturnCount,
    details:
      excessiveReturnCount === 0
        ? 'No returns exceed original purchased item quantities.'
        : `Found ${excessiveReturnCount} return items exceeding purchased quantities; showing up to 20.`,
    samples: excessiveReturns.map(r => ({
      id: r.order_item_id,
      purchasedQuantity: r.purchased_qty,
      returnedQuantity: Number(r.returned_qty),
    })),
  });

  // ---------------------------------------------------------------------------
  // Check 8: Missing Audit Records for Inventory Adjustments
  // ---------------------------------------------------------------------------
  const manualAdjustmentsWithoutAudit = await prisma.$queryRaw<
    Array<{
      movement_id: string;
      variant_id: string;
      reason: string;
      created_at: Date;
      total_count: bigint;
    }>
  >`
    WITH anomalies AS (
      SELECT im.id as movement_id, im.variant_id, im.reason, im.created_at
      FROM "inventory_movements" im
      LEFT JOIN "audit_logs" al ON (
        al.entity_type = 'variant'
        AND al.entity_id = im.variant_id
        AND al.action = 'INVENTORY_ADJUSTED'
        AND al.created_at BETWEEN im.created_at - INTERVAL '5 seconds' AND im.created_at + INTERVAL '5 seconds'
      )
      WHERE im.reference_type = 'ADMIN_ADJUSTMENT'
        AND im.type <> 'INITIAL'
        AND al.id IS NULL
    )
    SELECT *, COUNT(*) OVER() AS total_count FROM anomalies
    LIMIT 20
  `;
  const missingAuditCount = Number(manualAdjustmentsWithoutAudit[0]?.total_count ?? 0);

  checks.push({
    code: 'MISSING_AUDIT_LOGS',
    name: 'Admin Stock Adjustments Missing Audit Records',
    status: missingAuditCount === 0 ? 'PASS' : 'FAIL',
    anomalyCount: missingAuditCount,
    details:
      missingAuditCount === 0
        ? 'All admin stock adjustments have corresponding audit trail records.'
        : `Found ${missingAuditCount} stock adjustments lacking audit logs; showing up to 20.`,
    samples: manualAdjustmentsWithoutAudit.map(m => ({
      id: m.movement_id,
      variantId: m.variant_id,
      reason: m.reason,
      createdAt: m.created_at.toISOString(),
    })),
  });

  // ---------------------------------------------------------------------------
  // Check 9: Stuck Payment States
  // ---------------------------------------------------------------------------
  const stuckPaymentWhere = { status: { in: ['INITIATED', 'PENDING'] }, createdAt: { lte: oneHourAgo } } satisfies Prisma.PaymentWhereInput;
  const [stuckPaymentCount, stuckPayments] = await Promise.all([prisma.payment.count({ where: stuckPaymentWhere }), prisma.payment.findMany({
    where: {
      status: { in: ['INITIATED', 'PENDING'] },
      createdAt: { lte: oneHourAgo },
    },
    select: {
      id: true,
      orderId: true,
      provider: true,
      status: true,
      createdAt: true,
    },
    take: 20,
  })]);

  checks.push({
    code: 'STUCK_PAYMENT_STATES',
    name: 'Stuck Payments Pending > 60 Minutes',
    status: stuckPaymentCount === 0 ? 'PASS' : 'FAIL',
    anomalyCount: stuckPaymentCount,
    details:
      stuckPaymentCount === 0
        ? 'No payments stuck in INITIATED/PENDING status over 60 minutes.'
        : `Found ${stuckPaymentCount} payments stuck in pending state over 1 hour; showing up to 20.`,
    samples: stuckPayments.map(p => ({
      id: p.id,
      orderId: p.orderId,
      provider: p.provider,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    })),
  });

  // ---------------------------------------------------------------------------
  // Check 10: Expired Active Reservations
  // ---------------------------------------------------------------------------
  const expiredReservationWhere = { status: 'ACTIVE' as const, expiresAt: { lte: now } };
  const [expiredReservationCount, expiredActiveReservations] = await Promise.all([prisma.inventoryReservation.count({ where: expiredReservationWhere }), prisma.inventoryReservation.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lte: now },
    },
    select: {
      id: true,
      orderId: true,
      variantId: true,
      quantity: true,
      expiresAt: true,
    },
    take: 20,
  })]);

  checks.push({
    code: 'EXPIRED_ACTIVE_RESERVATIONS',
    name: 'Expired Reservations Still Marked Active',
    status: expiredReservationCount === 0 ? 'PASS' : 'FAIL',
    anomalyCount: expiredReservationCount,
    details:
      expiredReservationCount === 0
        ? 'No expired reservations remain active (background worker is up to date).'
        : `Found ${expiredReservationCount} expired reservations not yet cleared; showing up to 20.`,
    samples: expiredActiveReservations.map(r => ({
      id: r.id,
      orderId: r.orderId,
      variantId: r.variantId,
      quantity: r.quantity,
      expiresAt: r.expiresAt.toISOString(),
    })),
  });

  // ---------------------------------------------------------------------------
  // Check 11: Refund totals and aggregate payment status
  // ---------------------------------------------------------------------------
  const refundMismatches = await prisma.$queryRaw<Array<{
    id: string;
    amount_paise: number;
    refunded_paise: bigint;
    status: string;
    total_count: bigint;
  }>>`
    WITH anomalies AS (
      SELECT p.id, p.amount_paise, COALESCE(SUM(r.amount_paise) FILTER (WHERE r.status = 'SUCCEEDED'), 0) AS refunded_paise, p.status::text
      FROM payments p
      LEFT JOIN payment_refunds r ON r.payment_id = p.id
      GROUP BY p.id, p.amount_paise, p.status
      HAVING COALESCE(SUM(r.amount_paise) FILTER (WHERE r.status IN ('REQUESTED', 'PENDING', 'SUCCEEDED')), 0) > p.amount_paise
         OR (p.status = 'REFUNDED' AND COALESCE(SUM(r.amount_paise) FILTER (WHERE r.status = 'SUCCEEDED'), 0) <> p.amount_paise)
         OR (p.status <> 'REFUNDED' AND COALESCE(SUM(r.amount_paise) FILTER (WHERE r.status = 'SUCCEEDED'), 0) = p.amount_paise AND p.amount_paise > 0)
    )
    SELECT *, COUNT(*) OVER() AS total_count FROM anomalies
    LIMIT 20
  `;
  const refundMismatchCount = Number(refundMismatches[0]?.total_count ?? 0);
  checks.push({
    code: 'REFUND_LEDGER_MISMATCH',
    name: 'Captured, Refunded and Net Payment Reconciliation',
    status: refundMismatchCount === 0 ? 'PASS' : 'FAIL',
    anomalyCount: refundMismatchCount,
    details: refundMismatchCount === 0
      ? 'Refund totals do not exceed captures and full-refund aggregates match payment status.'
      : `Found ${refundMismatchCount} payments whose refund ledger does not match the captured aggregate; showing up to 20.`,
    samples: refundMismatches.map(row => ({
      id: row.id,
      capturedPaise: row.amount_paise,
      refundedPaise: Number(row.refunded_paise),
      netPaise: row.amount_paise - Number(row.refunded_paise),
      paymentStatus: row.status,
    })),
  });

  // ---------------------------------------------------------------------------
  // Check 12: Exact order line and total arithmetic
  // ---------------------------------------------------------------------------
  const financialMismatches = await prisma.$queryRaw<Array<{
    id: string; order_number: string; stored_subtotal: number; computed_subtotal: bigint;
    stored_total: number; computed_total: number; total_count: bigint;
  }>>`
    WITH order_sums AS (
      SELECT o.id, o.order_number, o.subtotal_paise AS stored_subtotal,
             COALESCE(SUM(oi.line_total_paise), 0) AS computed_subtotal,
             o.total_paise AS stored_total,
             (o.subtotal_paise - o.discount_paise + o.shipping_charge_paise + o.tax_paise) AS computed_total,
             BOOL_OR(oi.line_total_paise <> oi.unit_price_paise * oi.quantity) AS invalid_line
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      GROUP BY o.id
    ), anomalies AS (
      SELECT * FROM order_sums
      WHERE invalid_line OR stored_subtotal <> computed_subtotal OR stored_total <> computed_total
    )
    SELECT *, COUNT(*) OVER() AS total_count FROM anomalies LIMIT 20
  `;
  const financialMismatchCount = Number(financialMismatches[0]?.total_count ?? 0);
  checks.push({
    code: 'ORDER_FINANCIAL_INVARIANT',
    name: 'Order Line, Subtotal and Grand-total Arithmetic',
    status: financialMismatchCount === 0 ? 'PASS' : 'FAIL',
    anomalyCount: financialMismatchCount,
    details: financialMismatchCount === 0
      ? 'Every order line and stored order total matches integer-paise arithmetic.'
      : `Found ${financialMismatchCount} orders with inconsistent integer-paise arithmetic; showing up to 20.`,
    samples: financialMismatches.map(row => ({
      id: row.id, orderNumber: row.order_number, storedSubtotalPaise: row.stored_subtotal,
      computedSubtotalPaise: Number(row.computed_subtotal), storedTotalPaise: row.stored_total,
      computedTotalPaise: row.computed_total,
    })),
  });

  // ---------------------------------------------------------------------------
  // Check 13: Payment amount agrees with its order
  // ---------------------------------------------------------------------------
  const paymentAmountMismatches = await prisma.$queryRaw<Array<{
    id: string; order_id: string; payment_amount: number; order_total: number; total_count: bigint;
  }>>`
    WITH anomalies AS (
      SELECT p.id, p.order_id, p.amount_paise AS payment_amount, o.total_paise AS order_total
      FROM payments p JOIN orders o ON o.id = p.order_id
      WHERE p.amount_paise <> o.total_paise
    )
    SELECT *, COUNT(*) OVER() AS total_count FROM anomalies LIMIT 20
  `;
  const paymentAmountMismatchCount = Number(paymentAmountMismatches[0]?.total_count ?? 0);
  checks.push({
    code: 'PAYMENT_ORDER_AMOUNT_MISMATCH',
    name: 'Payment and Order Amount Agreement',
    status: paymentAmountMismatchCount === 0 ? 'PASS' : 'FAIL',
    anomalyCount: paymentAmountMismatchCount,
    details: paymentAmountMismatchCount === 0
      ? 'Every payment amount equals its authoritative order total.'
      : `Found ${paymentAmountMismatchCount} payments that disagree with their order total; showing up to 20.`,
    samples: paymentAmountMismatches.map(row => ({
      id: row.id, orderId: row.order_id, paymentAmountPaise: row.payment_amount, orderTotalPaise: row.order_total,
    })),
  });

  // ---------------------------------------------------------------------------
  // Check 14: Product review aggregates equal published review rows
  // ---------------------------------------------------------------------------
  const reviewMismatches = await prisma.$queryRaw<Array<{
    id: string; stored_rating: string; stored_count: number; computed_rating: string; computed_count: bigint; total_count: bigint;
  }>>`
    WITH aggregates AS (
      SELECT p.id, p.rating AS stored_rating, p.review_count AS stored_count,
             COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS computed_rating,
             COUNT(r.id) AS computed_count
      FROM products p
      LEFT JOIN reviews r ON r.product_id = p.id AND r.status = 'PUBLISHED'
      GROUP BY p.id
    ), anomalies AS (
      SELECT * FROM aggregates
      WHERE stored_rating <> computed_rating OR stored_count <> computed_count
    )
    SELECT *, COUNT(*) OVER() AS total_count FROM anomalies LIMIT 20
  `;
  const reviewMismatchCount = Number(reviewMismatches[0]?.total_count ?? 0);
  checks.push({
    code: 'PRODUCT_REVIEW_AGGREGATE_MISMATCH',
    name: 'Published Review Aggregate Agreement',
    status: reviewMismatchCount === 0 ? 'PASS' : 'FAIL',
    anomalyCount: reviewMismatchCount,
    details: reviewMismatchCount === 0
      ? 'All customer rating aggregates equal their published review rows.'
      : `Found ${reviewMismatchCount} products with stale customer review aggregates; showing up to 20.`,
    samples: reviewMismatches.map(row => ({
      id: row.id, storedRating: Number(row.stored_rating), storedCount: row.stored_count,
      computedRating: Number(row.computed_rating), computedCount: Number(row.computed_count),
    })),
  });

  // ---------------------------------------------------------------------------
  // Check 15: Durable checkout idempotency associations are complete and agree
  // ---------------------------------------------------------------------------
  const idempotencyMismatches = await prisma.$queryRaw<Array<{
    id: string; order_id: string | null; payment_id: string | null; total_count: bigint;
  }>>`
    WITH anomalies AS (
      SELECT ci.id, ci.order_id, ci.payment_id
      FROM checkout_idempotency ci
      LEFT JOIN orders o ON o.id = ci.order_id
      LEFT JOIN payments p ON p.id = ci.payment_id
      WHERE ci.order_id IS NULL OR ci.payment_id IS NULL OR o.id IS NULL OR p.id IS NULL OR p.order_id <> ci.order_id
    )
    SELECT *, COUNT(*) OVER() AS total_count FROM anomalies LIMIT 20
  `;
  const idempotencyMismatchCount = Number(idempotencyMismatches[0]?.total_count ?? 0);
  checks.push({
    code: 'CHECKOUT_IDEMPOTENCY_ASSOCIATION_MISMATCH',
    name: 'Checkout Idempotency Association Integrity',
    status: idempotencyMismatchCount === 0 ? 'PASS' : 'FAIL',
    anomalyCount: idempotencyMismatchCount,
    details: idempotencyMismatchCount === 0
      ? 'Every durable checkout key references one matching order and payment.'
      : `Found ${idempotencyMismatchCount} incomplete or contradictory checkout idempotency records; showing up to 20.`,
    samples: idempotencyMismatches.map(row => ({ id: row.id, orderId: row.order_id, paymentId: row.payment_id })),
  });

  // ---------------------------------------------------------------------------
  // Check 16: Durable unknown payment initiation states
  // ---------------------------------------------------------------------------
  const [unknownPaymentCount, unknownPayments] = await Promise.all([
    prisma.paymentInitiation.count({ where: { state: 'UNKNOWN' } }),
    prisma.paymentInitiation.findMany({
      where: { state: 'UNKNOWN' },
      select: { id: true, paymentId: true, updatedAt: true },
      take: 20,
    }),
  ]);

  checks.push({
    code: 'UNKNOWN_PAYMENT_INITIATIONS',
    name: 'Payment Initiations Requiring Reconciliation',
    status: unknownPaymentCount === 0 ? 'PASS' : 'FAIL',
    anomalyCount: unknownPaymentCount,
    details: unknownPaymentCount === 0
      ? 'No payment initiation has an unknown provider outcome.'
      : `Found ${unknownPaymentCount} payment initiations requiring provider reconciliation; showing up to 20.`,
    samples: unknownPayments.map(row => ({ id: row.id, paymentId: row.paymentId, updatedAt: row.updatedAt.toISOString() })),
  });

  // ---------------------------------------------------------------------------
  // Check 17: Failed or stale refunds requiring operator action
  // ---------------------------------------------------------------------------
  const refundCutoff = new Date(now.getTime() - 60 * 60 * 1000);
  const refundAttentionWhere = { OR: [
    { status: 'FAILED' as const },
    { status: { in: ['REQUESTED' as const, 'PENDING' as const] }, requestedAt: { lte: refundCutoff } },
  ] } satisfies Prisma.PaymentRefundWhereInput;
  const [refundAttentionCount, refundsRequiringAttention] = await Promise.all([
    prisma.paymentRefund.count({ where: refundAttentionWhere }),
    prisma.paymentRefund.findMany({
      where: refundAttentionWhere,
      select: { id: true, paymentId: true, status: true, failureCode: true, requestedAt: true },
      take: 20,
    }),
  ]);
  checks.push({
    code: 'REFUNDS_REQUIRING_ATTENTION',
    name: 'Failed or Stale Refunds',
    status: refundAttentionCount === 0 ? 'PASS' : 'FAIL',
    anomalyCount: refundAttentionCount,
    details: refundAttentionCount === 0
      ? 'No failed refunds or refund requests older than one hour require attention.'
      : `Found ${refundAttentionCount} refunds requiring operator action; showing up to 20.`,
    samples: refundsRequiringAttention.map(row => ({
      id: row.id,
      paymentId: row.paymentId,
      status: row.status,
      failureCode: row.failureCode,
      requestedAt: row.requestedAt.toISOString(),
    })),
  });

  const totalAnomalies = checks.reduce((sum, c) => sum + c.anomalyCount, 0);
  const passedChecks = checks.filter(c => c.status === 'PASS').length;
  const failedChecks = checks.filter(c => c.status === 'FAIL').length;

  return {
    timestamp: now.toISOString(),
    success: failedChecks === 0,
    totalChecks: checks.length,
    passedChecks,
    failedChecks,
    totalAnomalies,
    checks,
  };
}

export async function runDataConsistencyCLI(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('🔍 Executing Post-Deployment Data Integrity & Consistency Checks...\n');

  try {
    const report = await runDataConsistencyChecks();

    // eslint-disable-next-line no-console
    console.log(`Execution Timestamp: ${report.timestamp}`);
    // eslint-disable-next-line no-console
    console.log(`Total Checks Executed: ${report.totalChecks}`);
    // eslint-disable-next-line no-console
    console.log(`Passed: ${report.passedChecks} | Failed: ${report.failedChecks}\n`);

    for (const c of report.checks) {
      const mark = c.status === 'PASS' ? '✅' : '❌';
      // eslint-disable-next-line no-console
      console.log(`${mark} [${c.code}] ${c.name}`);
      // eslint-disable-next-line no-console
      console.log(`   ${c.details}`);
      if (c.samples.length > 0 && c.status === 'FAIL') {
        // eslint-disable-next-line no-console
        console.log(`   Samples: ${JSON.stringify(c.samples, null, 2)}`);
      }
    }

    if (!report.success) {
      await operationalAlerts.deliver({
        code: 'DATA_CONSISTENCY_DRIFT',
        severity: 'critical',
        summary: 'The read-only consistency scan detected durable state drift.',
        attributes: { failedChecks: report.failedChecks, totalAnomalies: report.totalAnomalies },
      }, `consistency:${report.checks.filter(check => check.status === 'FAIL').map(check => check.code).sort().join(',')}`);
      // eslint-disable-next-line no-console
      console.error(
        `\n❌ Data consistency checks detected ${report.totalAnomalies} anomalies across ${report.failedChecks} check(s).`,
      );
      process.exit(1);
    }

    // eslint-disable-next-line no-console
    console.log('\n✅ All data consistency checks PASSED. No contradictory states detected.\n');
    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Fatal failure running consistency checks:', err);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void runDataConsistencyCLI();
}
