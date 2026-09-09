CREATE TABLE "cart_merges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cart_merges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cart_merges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "cart_merges_user_id_idx" ON "cart_merges"("user_id");
