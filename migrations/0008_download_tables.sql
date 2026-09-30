-- Tables /api/download has always written to and read from, but that no
-- migration ever created: every download logged "no such table:
-- download_events", and a missing R2 file crashed the fallback lookup in
-- product_files instead of returning 404.
--
-- The Worker applies this itself (src/lib/schema.ts, on the hourly cron), so
-- running it by hand is optional. Safe to run more than once.
--   npx wrangler d1 execute buzzy-fly_db --remote --file=./migrations/0008_download_tables.sql

CREATE TABLE IF NOT EXISTS download_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   TEXT NOT NULL,
  item_id    TEXT NOT NULL,
  ip         TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_download_events_order ON download_events (order_id);

-- Optional fallback copy of a product file, served when the R2 object is missing.
CREATE TABLE IF NOT EXISTS product_files (
  item_id      TEXT PRIMARY KEY,
  file_name    TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_b64  TEXT NOT NULL
);
