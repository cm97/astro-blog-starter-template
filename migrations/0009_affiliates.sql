-- Partner (affiliate) program. See src/lib/affiliates.ts.
--
-- The Worker creates these itself (ensureAffiliateSchema, before any partner
-- read or write), so running this by hand is optional. Every statement is
-- idempotent.
--   npx wrangler d1 execute buzzy-fly_db --remote --file=./migrations/0009_affiliates.sql

CREATE TABLE IF NOT EXISTS affiliates (
  code         TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL UNIQUE,
  website      TEXT,
  audience     TEXT,
  payout_email TEXT,
  status       TEXT NOT NULL DEFAULT 'pending', -- pending | active | paused
  rate_pct     INTEGER NOT NULL DEFAULT 40,
  stats_token  TEXT NOT NULL UNIQUE,            -- private link to the partner's stats page
  created_at   INTEGER NOT NULL,
  approved_at  INTEGER
);

-- Clicks on /r/<code>, counted per day. No IPs or visitor data are stored.
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  code   TEXT NOT NULL,
  day    TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (code, day)
);

-- Which partner sent a PayPal order, written when checkout starts and read
-- when the buyer returns paid.
CREATE TABLE IF NOT EXISTS affiliate_order_refs (
  provider   TEXT NOT NULL,
  order_id   TEXT NOT NULL,
  code       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (provider, order_id)
);

-- One commission per paid order. pending -> paid (or void on refund).
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  provider         TEXT NOT NULL,
  order_id         TEXT NOT NULL,
  code             TEXT NOT NULL,
  item_id          TEXT NOT NULL,
  sale_cents       INTEGER NOT NULL,
  rate_pct         INTEGER NOT NULL,
  commission_cents INTEGER NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  created_at       INTEGER NOT NULL,
  paid_at          INTEGER,
  PRIMARY KEY (provider, order_id)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_code ON affiliate_commissions (code);
