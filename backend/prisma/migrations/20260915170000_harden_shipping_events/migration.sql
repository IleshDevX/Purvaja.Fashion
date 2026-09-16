CREATE TABLE "shipment_webhook_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider" VARCHAR(64) NOT NULL,
  "external_event_id" VARCHAR(128) NOT NULL,
  "shipment_id" UUID NOT NULL,
  "event_type" VARCHAR(64) NOT NULL,
  "payload_hash" VARCHAR(64) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'RECEIVED',
  "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMPTZ(6),
  CONSTRAINT "shipment_webhook_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shipment_webhook_events_shipment_id_fkey"
    FOREIGN KEY ("shipment_id") REFERENCES "order_shipments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "shipment_webhook_events_provider_external_event_id_key"
  ON "shipment_webhook_events"("provider", "external_event_id");
CREATE INDEX "shipment_webhook_events_shipment_id_received_at_idx"
  ON "shipment_webhook_events"("shipment_id", "received_at");
CREATE INDEX "shipment_webhook_events_status_received_at_idx"
  ON "shipment_webhook_events"("status", "received_at");
