-- A variant can override the parent product gallery's lead image. Existing
-- variants remain valid and continue to use the product-level fallback.
ALTER TABLE "product_variants"
ADD COLUMN "image_url" TEXT;
