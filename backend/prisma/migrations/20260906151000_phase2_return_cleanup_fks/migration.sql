ALTER TABLE "order_return_items" DROP CONSTRAINT "order_return_items_order_item_id_fkey";
ALTER TABLE "order_return_items"
  ADD CONSTRAINT "order_return_items_order_item_id_fkey"
  FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_returns" DROP CONSTRAINT "order_returns_order_id_fkey";
ALTER TABLE "order_returns"
  ADD CONSTRAINT "order_returns_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
