import type { InventoryMovementType, Prisma } from '../generated/prisma/client.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

/** Acquire every variant in the operation before reading any stock values. */
export async function lockInventory(tx: Prisma.TransactionClient, variantIds: string[]) {
  for (const id of [...new Set(variantIds)].sort()) {
    await tx.$queryRaw`SELECT id FROM "product_variants" WHERE id = ${id}::uuid FOR UPDATE`;
  }
}

type StockChange = { delta: number; target?: never } | { target: number; delta?: never };
type Movement = {
  type: InventoryMovementType;
  reason: string;
  referenceType: string;
  referenceId?: string;
};

/** Stock and its ledger entry share the caller's transaction and row lock. */
export async function changeStock(
  tx: Prisma.TransactionClient,
  variantId: string,
  change: StockChange,
  movement: Movement,
) {
  await lockInventory(tx, [variantId]);
  const current = await tx.productVariant.findUnique({ where: { id: variantId } });
  if (!current) throw new NotFoundError('Variant was not found.', 'VARIANT_NOT_FOUND');
  const resultingQuantity = change.target ?? current.stockQuantity + change.delta!;
  if (!Number.isSafeInteger(resultingQuantity) || resultingQuantity < 0) {
    throw new ValidationError('Stock cannot become negative or exceed supported quantities.', undefined, 'INSUFFICIENT_STOCK');
  }
  const delta = resultingQuantity - current.stockQuantity;
  if (delta === 0) {
    return { updated: current, previousQuantity: current.stockQuantity, resultingQuantity, delta };
  }
  const updated = await tx.productVariant.update({ where: { id: variantId }, data: { stockQuantity: resultingQuantity } });
  await tx.inventoryMovement.create({ data: {
    variantId,
    ...movement,
    // SALE historically records units sold as positive; all other movements
    // retain their signed adjustment, with before/after as the ledger authority.
    quantity: movement.type === 'SALE' ? -delta : delta,
    previousQuantity: current.stockQuantity,
    resultingQuantity,
  } });
  return { updated, previousQuantity: current.stockQuantity, resultingQuantity, delta };
}

/** Release an order's active reservations once and restore the exact reserved units. */
export async function releaseOrderReservations(
  tx: Prisma.TransactionClient,
  orderId: string,
  status: 'RELEASED' | 'EXPIRED',
  movementType: 'CANCELLATION' | 'RESTOCK',
  reason: string,
) {
  const active = await tx.inventoryReservation.findMany({
    where: { orderId, status: 'ACTIVE' },
    orderBy: { variantId: 'asc' },
  });
  if (!active.length) return 0;

  await lockInventory(tx, active.map(reservation => reservation.variantId));
  const released = await tx.inventoryReservation.updateMany({
    where: { orderId, status: 'ACTIVE' },
    data: { status, releasedAt: new Date() },
  });
  if (!released.count) return 0;

  for (const reservation of active) {
    await changeStock(tx, reservation.variantId, { delta: reservation.quantity }, {
      type: movementType,
      reason,
      referenceType: 'ORDER',
      referenceId: orderId,
    });
  }
  return released.count;
}
