CREATE TYPE "PaymentObservationSource" AS ENUM ('CALLBACK', 'STATUS_POLL', 'RECONCILIATION', 'DEMO', 'EXPIRY');
CREATE TYPE "PaymentObservedState" AS ENUM ('SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED', 'PENDING');
CREATE TYPE "PaymentObservationDisposition" AS ENUM ('APPLIED', 'DUPLICATE', 'IGNORED', 'LATE_CAPTURE');
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'PENDING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "RefundMode" AS ENUM ('DEMO', 'LIVE', 'UNKNOWN');
CREATE TYPE "RefundReason" AS ENUM ('ORDER_CANCELLED', 'RETURN', 'LATE_CAPTURE', 'LEGACY');

CREATE TABLE "payment_observations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "source" "PaymentObservationSource" NOT NULL,
    "observed_state" "PaymentObservedState" NOT NULL,
    "disposition" "PaymentObservationDisposition" NOT NULL,
    "deduplication_key" VARCHAR(128) NOT NULL,
    "amount_paise" INTEGER,
    "merchant_id" VARCHAR(255),
    "provider_reference" VARCHAR(255),
    "response_code" VARCHAR(120),
    "details" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_observations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_observations_amount_check" CHECK ("amount_paise" IS NULL OR "amount_paise" >= 0),
    CONSTRAINT "payment_observations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "payment_refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "return_id" UUID,
    "amount_paise" INTEGER NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "mode" "RefundMode" NOT NULL,
    "reason" "RefundReason" NOT NULL,
    "idempotency_key" VARCHAR(128) NOT NULL,
    "provider_reference" VARCHAR(255),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "failure_code" VARCHAR(120),
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_refunds_amount_check" CHECK ("amount_paise" > 0),
    CONSTRAINT "payment_refunds_attempt_count_check" CHECK ("attempt_count" >= 0),
    CONSTRAINT "payment_refunds_terminal_check" CHECK (
      ("status" IN ('SUCCEEDED', 'FAILED') AND "processed_at" IS NOT NULL)
      OR ("status" IN ('REQUESTED', 'PENDING') AND "processed_at" IS NULL)
    ),
    CONSTRAINT "payment_refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payment_refunds_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "order_returns"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "payment_observations_deduplication_key_key" ON "payment_observations"("deduplication_key");
CREATE INDEX "payment_observations_payment_id_created_at_idx" ON "payment_observations"("payment_id", "created_at");
CREATE INDEX "payment_observations_source_created_at_idx" ON "payment_observations"("source", "created_at");
CREATE UNIQUE INDEX "payment_refunds_return_id_key" ON "payment_refunds"("return_id");
CREATE UNIQUE INDEX "payment_refunds_idempotency_key_key" ON "payment_refunds"("idempotency_key");
CREATE UNIQUE INDEX "payment_refunds_provider_reference_key" ON "payment_refunds"("provider_reference");
CREATE INDEX "payment_refunds_payment_id_status_idx" ON "payment_refunds"("payment_id", "status");
CREATE INDEX "payment_refunds_status_requested_at_idx" ON "payment_refunds"("status", "requested_at");

-- Preserve legacy financial claims as explicit ledger entries. They remain
-- marked LEGACY because no provider settlement evidence can be reconstructed.
INSERT INTO "payment_refunds" (
  "payment_id", "amount_paise", "status", "mode", "reason",
  "idempotency_key", "provider_reference", "attempt_count", "processed_at", "updated_at"
)
SELECT
  "id", "amount_paise", 'SUCCEEDED'::"RefundStatus", 'UNKNOWN'::"RefundMode", 'LEGACY'::"RefundReason",
  'legacy-payment-refund:' || "id"::text,
  'legacy_refund_' || replace("id"::text, '-', ''),
  1, COALESCE("updated_at", CURRENT_TIMESTAMP), CURRENT_TIMESTAMP
FROM "payments"
WHERE "status" = 'REFUNDED';
