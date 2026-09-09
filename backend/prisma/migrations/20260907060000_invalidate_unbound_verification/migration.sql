-- An unbound legacy token cannot prove ownership of the current email.
-- Reissue via the normal verification flow; do not guess historical targets.
UPDATE "email_verification_tokens" SET "used_at" = CURRENT_TIMESTAMP
WHERE "target_email" IS NULL AND "used_at" IS NULL;
