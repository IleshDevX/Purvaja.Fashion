ALTER TABLE "email_verification_tokens" ADD COLUMN "target_email" VARCHAR(320);
-- Existing change-email tokens have no provable target binding. They must be
-- reissued; registration tokens can continue to verify their existing account.
UPDATE "email_verification_tokens" SET "used_at" = CURRENT_TIMESTAMP
WHERE "purpose" = 'EMAIL_CHANGE' AND "used_at" IS NULL;
