-- The previous migration inferred historical delivery from updated_at. That
-- value is not delivery evidence; retain unknown dates for manual verification.
DROP TRIGGER orders_delivery_fact_trigger ON orders;
ALTER TABLE orders DROP CONSTRAINT orders_delivery_fact_required;
UPDATE orders SET delivered_at = NULL WHERE delivered_at = updated_at;

CREATE OR REPLACE FUNCTION enforce_order_delivery_fact()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.delivered_at IS NOT NULL
     AND NEW.delivered_at IS DISTINCT FROM OLD.delivered_at THEN
    RAISE EXCEPTION 'orders.delivered_at is immutable once recorded';
  END IF;
  -- Only an actual delivery transition establishes a new lifecycle fact.
  -- Updating a historical delivered/returned order must not reopen its window.
  IF NEW.status = 'DELIVERED' AND NEW.delivered_at IS NULL THEN
    IF TG_OP = 'INSERT' THEN
      NEW.delivered_at := clock_timestamp();
    ELSIF OLD.status NOT IN ('DELIVERED', 'RETURN_REQUESTED', 'RETURNED') THEN
      NEW.delivered_at := clock_timestamp();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER orders_delivery_fact_trigger BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION enforce_order_delivery_fact();
