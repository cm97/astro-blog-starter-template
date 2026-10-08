-- One row per click on a /buy/<id> button. Created on demand by
-- src/lib/checkoutStarts.ts too, so applying this by hand is optional.
CREATE TABLE IF NOT EXISTS checkout_starts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id    TEXT NOT NULL,
  source     TEXT,
  method     TEXT NOT NULL,
  is_bot     INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_checkout_starts_created_at ON checkout_starts (created_at);
