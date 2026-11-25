-- Refund / dispute revocation for Stripe orders (src/lib/stripeRevocation.ts).
-- The Worker creates these tables itself on first use, so running this by hand
-- is optional. Safe to run more than once.
--   npx wrangler d1 execute buzzy-fly_db --remote --file=./migrations/0012_stripe_revocation.sql

CREATE TABLE IF NOT EXISTS stripe_payments (
  payment_intent TEXT PRIMARY KEY,
  order_id       TEXT NOT NULL,
  item_id        TEXT,
  created_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS order_revocations (
  provider   TEXT NOT NULL,
  order_id   TEXT NOT NULL,
  reason     TEXT NOT NULL,
  event_id   TEXT,
  revoked_at INTEGER NOT NULL,
  PRIMARY KEY (provider, order_id)
);
