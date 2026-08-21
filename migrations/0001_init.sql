-- Schema for the D1 database bound as `DB` (buzzy-fly_db).
--
-- The tables already exist in production (created by hand on 2026-08-12), but
-- there was no migration in version control, so the schema could not be
-- recreated or reviewed. This file records it.
--
-- Apply with:
--   npx wrangler d1 execute buzzy-fly_db --remote --file=./migrations/0001_init.sql

CREATE TABLE IF NOT EXISTS subscribers (
  email      TEXT PRIMARY KEY,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS fulfillments (
  provider       TEXT,
  order_id       TEXT,
  item_id        TEXT,
  customer_email TEXT,
  created_at     INTEGER
);

-- Payment providers retry webhooks on any non-200, and a retry must not
-- create a second fulfillment row for the same purchase.
CREATE UNIQUE INDEX IF NOT EXISTS idx_fulfillments_provider_order
  ON fulfillments (provider, order_id);

-- Supports re-sending a download link from the order record instead of
-- replaying the webhook.
CREATE INDEX IF NOT EXISTS idx_fulfillments_email
  ON fulfillments (customer_email);

-- Dedupe store for the hourly order-watch task, so a pending order is only
-- alerted on once.
CREATE TABLE IF NOT EXISTS fulfillment_alerts (
  provider   TEXT NOT NULL,
  order_id   TEXT NOT NULL,
  alerted_at INTEGER NOT NULL,
  PRIMARY KEY (provider, order_id)
);
