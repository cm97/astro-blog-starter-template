-- Weekly email sequence for free-checklist subscribers, plus unsubscribe.
--
-- sequence_step: index of the last sequence email sent. 0 = the welcome
--   email (sent at signup), so existing subscribers start at 0 and get
--   email 1 next.
-- sequence_sent_at: when the last sequence email went out. NULL falls back
--   to created_at when working out whether the next one is due.
--
-- The Worker applies this itself on the hourly cron (src/lib/schema.ts), so
-- running it by hand is optional. ALTER TABLE ... ADD COLUMN is not
-- idempotent in SQLite: if you do run it by hand, run it once.
-- Apply with:
--   npx wrangler d1 execute buzzy-fly_db --remote --file=./migrations/0006_email_sequence.sql

ALTER TABLE subscribers ADD COLUMN unsubscribe_token TEXT;
ALTER TABLE subscribers ADD COLUMN unsubscribed_at INTEGER;
ALTER TABLE subscribers ADD COLUMN sequence_step INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscribers ADD COLUMN sequence_sent_at INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_unsubscribe_token
  ON subscribers (unsubscribe_token);

-- The buyer follow-up job in src/worker-entry.ts writes here, but no
-- migration created it. No-op if it already exists in production.
CREATE TABLE IF NOT EXISTS followup_emails (
  provider TEXT NOT NULL,
  order_id TEXT NOT NULL,
  sent_at  INTEGER NOT NULL,
  success  INTEGER NOT NULL,
  PRIMARY KEY (provider, order_id)
);
