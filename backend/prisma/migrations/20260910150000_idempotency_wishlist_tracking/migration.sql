-- Prune any orphaned checkout idempotency rows before adding constraints
DELETE FROM "checkout_idempotency"
WHERE "order_id" IS NOT NULL AND "order_id" NOT IN (SELECT "id" FROM "orders");

DELETE FROM "checkout_idempotency"
WHERE "payment_id" IS NOT NULL AND "payment_id" NOT IN (SELECT "id" FROM "payments");

DELETE FROM "checkout_idempotency"
WHERE "user_id" NOT IN (SELECT "id" FROM "users");

-- Add foreign key constraints safely on checkout_idempotency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'checkout_idempotency_user_id_fkey'
  ) THEN
    ALTER TABLE "checkout_idempotency"
      ADD CONSTRAINT "checkout_idempotency_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'checkout_idempotency_order_id_fkey'
  ) THEN
    ALTER TABLE "checkout_idempotency"
      ADD CONSTRAINT "checkout_idempotency_order_id_fkey"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'checkout_idempotency_payment_id_fkey'
  ) THEN
    ALTER TABLE "checkout_idempotency"
      ADD CONSTRAINT "checkout_idempotency_payment_id_fkey"
      FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Create wishlist_items table
CREATE TABLE IF NOT EXISTS "wishlist_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wishlist_items_user_id_product_id_key" UNIQUE ("user_id", "product_id"),
  CONSTRAINT "wishlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "wishlist_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "wishlist_items_user_id_idx" ON "wishlist_items"("user_id");
CREATE INDEX IF NOT EXISTS "wishlist_items_product_id_idx" ON "wishlist_items"("product_id");

-- Create order_shipments table
CREATE TABLE IF NOT EXISTS "order_shipments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "carrier" VARCHAR(64) NOT NULL,
  "tracking_number" VARCHAR(128) NOT NULL,
  "awb_code" VARCHAR(128),
  "status" VARCHAR(64) NOT NULL DEFAULT 'MANIFESTED',
  "tracking_url" VARCHAR(500),
  "details" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_shipments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_shipments_order_id_key" UNIQUE ("order_id"),
  CONSTRAINT "order_shipments_tracking_number_key" UNIQUE ("tracking_number"),
  CONSTRAINT "order_shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "order_shipments_tracking_number_idx" ON "order_shipments"("tracking_number");
