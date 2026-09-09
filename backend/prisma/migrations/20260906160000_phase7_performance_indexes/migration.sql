-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_status_is_featured_created_at_idx" ON "products"("status", "is_featured" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_updated_at_id_idx" ON "products"("updated_at" DESC, "id" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "product_variants_updated_at_id_idx" ON "product_variants"("updated_at" DESC, "id" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cart_items_variant_id_idx" ON "cart_items"("variant_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_items_variant_id_idx" ON "order_items"("variant_id");
