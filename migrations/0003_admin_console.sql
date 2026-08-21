-- Admin console (/admin) support tables.
--
-- The console otherwise reads and writes tables that already exist:
--   subscribers, fulfillments   -- 0001_init.sql
--   download_tokens             -- 0002_download_tokens.sql
--   site_content                -- already in production; reused as the
--                                  key/value store for editable site settings
--                                  rather than adding a second one.
--
-- Apply with:
--   npx wrangler d1 execute buzzy-fly_db --remote --file=./migrations/0003_admin_console.sql

-- Append-only record of every admin action (logins, post publishes, subscriber
-- removals, re-issued download links, settings changes) so there is a trail of
-- what the console did and when.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  actor      TEXT NOT NULL,
  action     TEXT NOT NULL,
  detail     TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
  ON admin_audit_log (created_at);

-- site_content is created here only so a fresh database matches production;
-- production already has it.
CREATE TABLE IF NOT EXISTS site_content (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
