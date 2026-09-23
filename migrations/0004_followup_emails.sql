-- Hourly cron support (src/worker-entry.ts `scheduled`).
--
-- Until this release the cron handler was never deployed (astro.config.mjs
-- used the misspelled `workerEntrypoint` key, so the adapter ignored the
-- custom entry), and `followup_emails` was never created. Turning the cron
-- on against existing data would email every past buyer a "2-day check-in"
-- and send the owner an alert listing every historical order, so existing
-- orders are marked as already handled. Only orders placed after this
-- migration get the follow-up email and the owner alert.
--
-- Apply BEFORE deploying the code that enables the cron:
--   npx wrangler d1 execute buzzy-fly_db --remote --file=./migrations/0004_followup_emails.sql

CREATE TABLE IF NOT EXISTS followup_emails (
  provider TEXT NOT NULL,
  order_id TEXT NOT NULL,
  sent_at  INTEGER NOT NULL,
  success  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (provider, order_id)
);

INSERT OR IGNORE INTO followup_emails (provider, order_id, sent_at, success)
  SELECT provider, order_id, CAST(strftime('%s','now') AS INTEGER) * 1000, 0
  FROM fulfillments
  WHERE provider IS NOT NULL AND order_id IS NOT NULL;

INSERT OR IGNORE INTO fulfillment_alerts (provider, order_id, alerted_at)
  SELECT provider, order_id, CAST(strftime('%s','now') AS INTEGER) * 1000
  FROM fulfillments
  WHERE provider IS NOT NULL AND order_id IS NOT NULL;
