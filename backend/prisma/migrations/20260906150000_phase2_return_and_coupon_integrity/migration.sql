CREATE TYPE "ReturnRequestStatus" AS ENUM ('REQUESTED', 'COMPLETED', 'REJECTED');

CREATE TABLE "order_returns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" "ReturnRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "order_returns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_return_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "return_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "order_return_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_return_items_quantity_check" CHECK ("quantity" > 0)
);

CREATE UNIQUE INDEX "order_returns_order_id_key" ON "order_returns"("order_id");
CREATE INDEX "order_returns_status_created_at_idx" ON "order_returns"("status", "created_at");
CREATE UNIQUE INDEX "order_return_items_return_id_order_item_id_key" ON "order_return_items"("return_id", "order_item_id");
CREATE INDEX "order_return_items_order_item_id_idx" ON "order_return_items"("order_item_id");

ALTER TABLE "order_returns"
  ADD CONSTRAINT "order_returns_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_return_items"
  ADD CONSTRAINT "order_return_items_return_id_fkey"
  FOREIGN KEY ("return_id") REFERENCES "order_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_return_items"
  ADD CONSTRAINT "order_return_items_order_item_id_fkey"
  FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "coupon_redemptions_coupon_id_user_id_key" ON "coupon_redemptions"("coupon_id", "user_id");
