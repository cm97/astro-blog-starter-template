-- Monthly Drop subscription web app (/drop).
--
-- drop_subscriptions: one row per Stripe subscription, kept current by the
-- webhook (checkout.session.completed + customer.subscription.updated/deleted).
-- Access to /drop ends when status leaves active / trialing / past_due.
--
-- drop_app_data: each subscriber's saved work, per monthly issue, keyed by the
-- checkout session id their unlock token carries.
--
-- The Worker creates these itself on first use (src/lib/dropAccess.ts), so
-- running this by hand is optional. Safe to run more than once.
--   npx wrangler d1 execute buzzy-fly_db --remote --file=./migrations/0009_monthly_drop.sql

CREATE TABLE IF NOT EXISTS drop_subscriptions (
  subscription_id     TEXT PRIMARY KEY,
  checkout_session_id TEXT,
  customer_id         TEXT,
  customer_email      TEXT,
  status              TEXT NOT NULL,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drop_subscriptions_session ON drop_subscriptions (checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_drop_subscriptions_email ON drop_subscriptions (customer_email);

CREATE TABLE IF NOT EXISTS drop_app_data (
  account_id TEXT NOT NULL,
  issue      TEXT NOT NULL,
  data_json  TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, issue)
);
