-- Align order_shipments updated_at column to match Prisma schema (no database default)
ALTER TABLE "order_shipments" ALTER COLUMN "updated_at" DROP DEFAULT;

-- Ensure wishlist_items id has default gen_random_uuid() and product index exists
ALTER TABLE "wishlist_items" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS "wishlist_items_product_id_idx" ON "wishlist_items"("product_id");

-- Drop stray columns on orders if they exist to match schema.prisma
ALTER TABLE "orders" DROP COLUMN IF EXISTS "carrier_name";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "tracking_number";
