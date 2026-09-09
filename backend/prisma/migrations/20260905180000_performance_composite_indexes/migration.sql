-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_is_deal_status_idx" ON "products"("is_deal", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_status_base_price_paise_idx" ON "products"("status", "base_price_paise");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_status_rating_idx" ON "products"("status", "rating");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inventory_movements_created_at_idx" ON "inventory_movements"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "inventory_reservations_created_at_idx" ON "inventory_reservations"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_status_expires_at_idx" ON "payments"("status", "expires_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");
