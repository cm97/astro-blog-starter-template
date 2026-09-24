-- Buzzyfly AI (/ai) freemium + subscription paywall.
--
-- Apply with:
--   npx wrangler d1 execute buzzy-fly_db --remote --file=./migrations/0004_ai_paywall.sql

-- Free-tier usage, one row per visitor per UTC day. `visitor` is a SHA-256 of
-- the visitor's IP (never the raw IP), so clearing cookies doesn't reset it.
CREATE TABLE IF NOT EXISTS ai_usage (
  visitor TEXT NOT NULL,
  day     TEXT NOT NULL,
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (visitor, day)
);

-- Paying subscribers, written by the Stripe webhook. Access is granted only
-- while status is 'active' or 'trialing'.
CREATE TABLE IF NOT EXISTS ai_subscriptions (
  email                  TEXT PRIMARY KEY,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  status                 TEXT NOT NULL,
  created_at             INTEGER NOT NULL,
  updated_at             INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_subscriptions_subscription
  ON ai_subscriptions (stripe_subscription_id);

-- One-time sign-in links emailed to subscribers (after checkout, or from the
-- "already subscribed?" form). Deleted when used.
CREATE TABLE IF NOT EXISTS ai_login_tokens (
  token      TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

-- Signed-in subscriber sessions (the `buzzyfly_ai_session` cookie holds the
-- token). Stored rather than HMAC-signed so no extra Worker secret is needed;
-- delete a row to sign that browser out.
CREATE TABLE IF NOT EXISTS ai_sessions (
  token      TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
