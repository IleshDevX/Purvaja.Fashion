-- Persist customer-entered preferences and newsletter consent. Newsletter
-- delivery remains pending until an email provider activates the record.
ALTER TABLE "users"
  ADD COLUMN "preferred_fit" VARCHAR(80),
  ADD COLUMN "preferred_collar" VARCHAR(120);

CREATE TABLE "newsletter_subscriptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" VARCHAR(320) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING_PROVIDER',
  "consent_source" VARCHAR(80) NOT NULL,
  "consented_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unsubscribed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "newsletter_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "newsletter_subscriptions_status_check"
    CHECK ("status" IN ('PENDING_PROVIDER', 'SUBSCRIBED', 'UNSUBSCRIBED')),
  CONSTRAINT "newsletter_subscriptions_lifecycle_check"
    CHECK (("status" = 'UNSUBSCRIBED' AND "unsubscribed_at" IS NOT NULL)
      OR ("status" <> 'UNSUBSCRIBED' AND "unsubscribed_at" IS NULL))
);

CREATE UNIQUE INDEX "newsletter_subscriptions_email_key"
  ON "newsletter_subscriptions" ("email");
CREATE INDEX "newsletter_subscriptions_status_consented_at_idx"
  ON "newsletter_subscriptions" ("status", "consented_at");
