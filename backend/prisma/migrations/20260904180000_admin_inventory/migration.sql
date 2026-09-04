ALTER TYPE "InventoryMovementType" ADD VALUE IF NOT EXISTS 'RESTOCK';
ALTER TYPE "InventoryMovementType" ADD VALUE IF NOT EXISTS 'DAMAGE';
ALTER TYPE "InventoryMovementType" ADD VALUE IF NOT EXISTS 'CORRECTION';

ALTER TABLE "categories" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "product_variants" ADD COLUMN "low_stock_threshold" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_low_stock_threshold_check" CHECK ("low_stock_threshold" >= 0);
CREATE INDEX "product_variants_stock_quantity_idx" ON "product_variants"("stock_quantity");
