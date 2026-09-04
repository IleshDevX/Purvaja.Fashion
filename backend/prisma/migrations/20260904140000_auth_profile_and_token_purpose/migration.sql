CREATE TYPE "EmailVerificationPurpose" AS ENUM ('REGISTRATION', 'EMAIL_CHANGE');

ALTER TABLE "users"
  ADD COLUMN "first_name" VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN "last_name" VARCHAR(100) NOT NULL DEFAULT '',
  ADD COLUMN "phone" VARCHAR(32),
  ADD COLUMN "pending_email" VARCHAR(320);

ALTER TABLE "email_verification_tokens"
  ADD COLUMN "purpose" "EmailVerificationPurpose" NOT NULL DEFAULT 'REGISTRATION';

CREATE INDEX "email_verification_tokens_user_id_purpose_expires_at_idx"
  ON "email_verification_tokens"("user_id", "purpose", "expires_at");
