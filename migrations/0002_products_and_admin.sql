-- Adds the product catalog, editable site content, and admin login support.
--
-- Before this migration the only "catalog" was a hardcoded TypeScript map in
-- src/data/monetization.ts, so adding a product meant a code edit and a
-- redeploy, and nothing rendered it to visitors. Products now live in D1 so the
-- admin console can create and edit them at runtime.
--
-- Apply with:
--   npx wrangler d1 execute buzzy-fly_db --remote --file=./migrations/0002_products_and_admin.sql

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
-- `id` is the URL-safe slug (e.g. "buzzyfly-digital-system"). It doubles as the
-- default item identifier, so existing PRODUCT_FILE_MAP keys keep working.
--
-- Price is stored in minor units (cents) rather than a display string like
-- "$49", so it can be formatted per-currency and compared or summed later.
CREATE TABLE IF NOT EXISTS products (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  summary       TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  -- JSON array of bullet-point strings shown on the product card.
  features      TEXT NOT NULL DEFAULT '[]',
  price_cents   INTEGER NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'USD',
  -- Hosted Stripe / Lemon Squeezy checkout link the "Buy" button points at.
  checkout_url  TEXT,
  -- Private object in the MY_PRODUCTS R2 bucket delivered after purchase.
  r2_key        TEXT,
  file_name     TEXT,
  content_type  TEXT NOT NULL DEFAULT 'application/zip',
  -- 'draft' products are hidden from the public site; only 'active' ones show.
  status        TEXT NOT NULL DEFAULT 'draft',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

-- The landing page lists active products in a stable, admin-controlled order.
CREATE INDEX IF NOT EXISTS idx_products_status_sort
  ON products (status, sort_order);

-- ---------------------------------------------------------------------------
-- External payment identifiers -> product
-- ---------------------------------------------------------------------------
-- A single product can be sold through more than one identifier: a Stripe
-- price_id, a Lemon Squeezy variant_id, and the legacy slug used in existing
-- checkout links. Fulfillment resolves an incoming webhook's item_id through
-- this table, so re-pricing in Stripe doesn't break delivery.
CREATE TABLE IF NOT EXISTS product_item_ids (
  item_id    TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  provider   TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_item_ids_product
  ON product_item_ids (product_id);

-- ---------------------------------------------------------------------------
-- Editable site content
-- ---------------------------------------------------------------------------
-- Key/value copy for the landing page (hero headline, CTA text, and so on) so
-- wording changes don't require a deploy. Unknown keys fall back to the
-- defaults in src/data/siteDefaults.ts, which means the site still renders
-- correctly against an empty table.
CREATE TABLE IF NOT EXISTS site_content (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- ---------------------------------------------------------------------------
-- Admin login throttling
-- ---------------------------------------------------------------------------
-- The admin console is protected by a single shared password, which makes it a
-- realistic online brute-force target. Failed attempts are recorded per client
-- IP so the login endpoint can lock out after repeated failures.
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  ip           TEXT PRIMARY KEY,
  failed_count INTEGER NOT NULL DEFAULT 0,
  last_failed  INTEGER NOT NULL,
  locked_until INTEGER
);

-- ---------------------------------------------------------------------------
-- Seed: carry the existing hardcoded product across so nothing regresses
-- ---------------------------------------------------------------------------
-- Matches the single entry that was in PRODUCT_FILE_MAP. Seeded as 'draft' so
-- it does not appear on the live site until it has been reviewed and priced in
-- the admin console.
INSERT OR IGNORE INTO products (
  id, title, summary, description, features,
  price_cents, currency, r2_key, file_name, content_type,
  status, sort_order, created_at, updated_at
) VALUES (
  'buzzyfly-digital-system',
  'Buzzyfly Digital System',
  'The complete Buzzyfly operating framework to streamline your workflow.',
  'The complete Buzzyfly operating framework to streamline your workflow.',
  '[]',
  4900,
  'USD',
  'products/buzzyfly-digital-system.zip',
  'buzzyfly-digital-system.zip',
  'application/zip',
  'draft',
  0,
  unixepoch(),
  unixepoch()
);

INSERT OR IGNORE INTO product_item_ids (item_id, product_id, provider, created_at)
VALUES ('buzzyfly-digital-system', 'buzzyfly-digital-system', NULL, unixepoch());
