-- Shared rate-limit counters (fixed window) used by /api/download and the
-- admin login. In-memory counters reset on every Worker instance, so a bot
-- spread across instances sailed past them; D1 makes the limit global.
--
-- The Worker also creates this table itself on first use (src/lib/rateLimit.ts),
-- so running it by hand is optional. Safe to run more than once.
--   npx wrangler d1 execute buzzy-fly_db --remote --file=./migrations/0009_rate_limits.sql

CREATE TABLE IF NOT EXISTS rate_limits (
  key      TEXT PRIMARY KEY,
  count    INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits (reset_at);
