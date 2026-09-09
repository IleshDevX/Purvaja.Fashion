CREATE TYPE "PaymentInitiationState" AS ENUM ('READY', 'LEASED', 'SUCCEEDED', 'UNKNOWN', 'FAILED');

CREATE TABLE "payment_initiations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "state" "PaymentInitiationState" NOT NULL DEFAULT 'READY',
    "lease_token" UUID,
    "lease_expires_at" TIMESTAMPTZ(6),
    "provider_reference" VARCHAR(255),
    "redirect_url" TEXT,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_error_code" VARCHAR(120),
    "last_error_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_initiations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_initiations_payment_id_key" UNIQUE ("payment_id"),
    CONSTRAINT "payment_initiations_attempt_count_check" CHECK ("attempt_count" >= 0),
    CONSTRAINT "payment_initiations_lease_check" CHECK (
      ("state" = 'LEASED' AND "lease_token" IS NOT NULL AND "lease_expires_at" IS NOT NULL)
      OR
      ("state" <> 'LEASED' AND "lease_token" IS NULL AND "lease_expires_at" IS NULL)
    ),
    CONSTRAINT "payment_initiations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "payment_initiations_state_lease_expires_at_idx"
  ON "payment_initiations"("state", "lease_expires_at");

-- Expand safely for mixed-version rollout. Existing payments receive one
-- durable initiation record without altering their payment outcome.
INSERT INTO "payment_initiations" (
  "payment_id",
  "state",
  "provider_reference",
  "attempt_count",
  "last_error_code",
  "updated_at"
)
SELECT
  "id",
  CASE
    WHEN "status" IN ('SUCCESS', 'PAID', 'AUTHORIZED') THEN 'SUCCEEDED'::"PaymentInitiationState"
    WHEN "status" = 'INITIATED' THEN 'UNKNOWN'::"PaymentInitiationState"
    WHEN "status" IN ('FAILED', 'EXPIRED', 'REFUNDED', 'CANCELLED') THEN 'FAILED'::"PaymentInitiationState"
    ELSE 'READY'::"PaymentInitiationState"
  END,
  "provider_reference",
  CASE WHEN "status" = 'PENDING' THEN 0 ELSE 1 END,
  CASE WHEN "status" = 'INITIATED' THEN 'LEGACY_SESSION_RESPONSE_UNAVAILABLE' ELSE NULL END,
  CURRENT_TIMESTAMP
FROM "payments"
ON CONFLICT ("payment_id") DO NOTHING;
