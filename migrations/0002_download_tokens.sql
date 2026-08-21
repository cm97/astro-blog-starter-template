-- Secret-free download authorization.
--
-- /api/download accepts a random token looked up here, as an alternative to an
-- HMAC token signed with DOWNLOAD_TOKEN_SECRET. This lets a paid order be
-- delivered by the out-of-band fulfiller (the hourly "Buzzyfly order watch"
-- task, which polls Stripe directly) without any Worker secret being set.
--
-- Rows here are capabilities: anyone holding the token can download the file
-- until it expires. Delete a row to revoke a link immediately.
--
-- NOTE: this table was applied directly to the production D1 database
-- (buzzy-fly_db, c4ff4255-c51b-45a7-85a5-4583328b26c4) on 2026-08-15. This file
-- exists so a fresh database matches production.

CREATE TABLE IF NOT EXISTS download_tokens (
  token TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  customer_email TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_download_tokens_order ON download_tokens (order_id);
