ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'INITIATED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'SUCCESS';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

CREATE TYPE "InventoryReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED');

ALTER TABLE "payments"
  ADD COLUMN "idempotency_key" UUID,
  ADD COLUMN "expires_at" TIMESTAMPTZ(6);

UPDATE "payments" SET "idempotency_key" = gen_random_uuid() WHERE "idempotency_key" IS NULL;
ALTER TABLE "payments" ALTER COLUMN "idempotency_key" SET NOT NULL;
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

CREATE TABLE "inventory_reservations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" "InventoryReservationStatus" NOT NULL DEFAULT 'ACTIVE',
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "released_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_reservations_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "inventory_reservations_order_id_variant_id_key" UNIQUE ("order_id", "variant_id"),
  CONSTRAINT "inventory_reservations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "inventory_reservations_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "inventory_reservations_status_expires_at_idx" ON "inventory_reservations"("status", "expires_at");
CREATE INDEX "inventory_reservations_variant_id_status_idx" ON "inventory_reservations"("variant_id", "status");
