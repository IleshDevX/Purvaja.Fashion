-- Preserve catalogue fixture social proof separately from customer-authored
-- review aggregates. Products with published reviews are recomputed from the
-- authoritative review ledger; products without them retain old display
-- figures only as explicitly editorial metadata.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'OUT_FOR_DELIVERY' AFTER 'SHIPPED';

ALTER TABLE "products"
  ADD COLUMN "editorial_rating" DECIMAL(2,1),
  ADD COLUMN "editorial_review_count" INTEGER NOT NULL DEFAULT 0;

WITH published AS (
  SELECT
    product_id,
    COUNT(*)::INTEGER AS review_count,
    ROUND(AVG(rating)::numeric, 1) AS rating
  FROM "reviews"
  WHERE status = 'PUBLISHED'
  GROUP BY product_id
)
UPDATE "products" p
SET
  editorial_rating = CASE WHEN published.product_id IS NULL AND p.review_count > 0 THEN p.rating ELSE NULL END,
  editorial_review_count = CASE WHEN published.product_id IS NULL THEN p.review_count ELSE 0 END,
  rating = COALESCE(published.rating, 0),
  review_count = COALESCE(published.review_count, 0)
FROM (SELECT p2.id, pub.product_id, pub.review_count, pub.rating
      FROM "products" p2
      LEFT JOIN published pub ON pub.product_id = p2.id) published
WHERE p.id = published.id;

ALTER TABLE "products"
  ADD CONSTRAINT "products_customer_rating_range_check"
    CHECK (rating >= 0 AND rating <= 5),
  ADD CONSTRAINT "products_customer_review_count_check"
    CHECK (review_count >= 0),
  ADD CONSTRAINT "products_editorial_rating_range_check"
    CHECK (editorial_rating IS NULL OR (editorial_rating >= 0 AND editorial_rating <= 5)),
  ADD CONSTRAINT "products_editorial_review_count_check"
    CHECK (editorial_review_count >= 0),
  ADD CONSTRAINT "products_customer_rating_count_check"
    CHECK ((review_count = 0 AND rating = 0) OR (review_count > 0 AND rating > 0));

ALTER TABLE "products"
  ADD CONSTRAINT "products_base_price_nonnegative_check" CHECK (base_price_paise >= 0),
  ADD CONSTRAINT "products_compare_price_nonnegative_check" CHECK (compare_at_price_paise IS NULL OR compare_at_price_paise >= 0);

ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_price_override_nonnegative_check" CHECK (price_override_paise IS NULL OR price_override_paise >= 0);

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_unit_price_nonnegative_check" CHECK (unit_price_paise >= 0),
  ADD CONSTRAINT "order_items_quantity_positive_check" CHECK (quantity > 0),
  ADD CONSTRAINT "order_items_line_total_check" CHECK (line_total_paise = unit_price_paise * quantity);

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_money_nonnegative_check"
    CHECK (subtotal_paise >= 0 AND discount_paise >= 0 AND shipping_charge_paise >= 0 AND tax_paise >= 0 AND total_paise >= 0),
  ADD CONSTRAINT "orders_discount_bounded_check" CHECK (discount_paise <= subtotal_paise),
  ADD CONSTRAINT "orders_total_arithmetic_check"
    CHECK (total_paise = subtotal_paise - discount_paise + shipping_charge_paise + tax_paise);

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_positive_check" CHECK (amount_paise > 0);
