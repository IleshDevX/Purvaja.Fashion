-- Links created by the authentication service remain unusable until the email
-- provider confirms the idempotent delivery request. Existing issued links
-- predate this state machine and remain active for compatibility.
ALTER TABLE "email_verification_tokens"
  ADD COLUMN "delivery_pending" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "password_reset_tokens"
  ADD COLUMN "delivery_pending" BOOLEAN NOT NULL DEFAULT false;
