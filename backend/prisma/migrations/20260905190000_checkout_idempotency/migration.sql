-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "idempotency_key" TYPE VARCHAR(128) USING "idempotency_key"::text;

-- CreateTable
CREATE TABLE IF NOT EXISTS "checkout_idempotency" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(128) NOT NULL,
    "user_id" UUID NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "order_id" UUID,
    "payment_id" UUID,
    "response" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "checkout_idempotency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "checkout_idempotency_key_key" ON "checkout_idempotency"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "checkout_idempotency_key_user_id_idx" ON "checkout_idempotency"("key", "user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "checkout_idempotency_expires_at_idx" ON "checkout_idempotency"("expires_at");
