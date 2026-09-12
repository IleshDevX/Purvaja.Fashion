ALTER TABLE "orders" ADD COLUMN "delivered_at" TIMESTAMPTZ(6);

UPDATE "orders"
SET "delivered_at" = "updated_at"
WHERE "status" IN ('DELIVERED', 'RETURN_REQUESTED', 'RETURNED')
  AND "delivered_at" IS NULL;

CREATE OR REPLACE FUNCTION enforce_order_delivery_fact()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.delivered_at IS NOT NULL
     AND NEW.delivered_at IS DISTINCT FROM OLD.delivered_at THEN
    RAISE EXCEPTION 'orders.delivered_at is immutable once recorded';
  END IF;

  IF NEW.status IN ('DELIVERED', 'RETURN_REQUESTED', 'RETURNED')
     AND NEW.delivered_at IS NULL THEN
    NEW.delivered_at := clock_timestamp();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_delivery_fact_trigger
BEFORE INSERT OR UPDATE ON "orders"
FOR EACH ROW EXECUTE FUNCTION enforce_order_delivery_fact();

ALTER TABLE "orders"
ADD CONSTRAINT "orders_delivery_fact_required"
CHECK ("status" NOT IN ('DELIVERED', 'RETURN_REQUESTED', 'RETURNED') OR "delivered_at" IS NOT NULL);
