-- Buzzyfly admin console schema.
-- Apply with:
--   wrangler d1 execute buzzy-fly_db --file=migrations/0001_init.sql --local
--   wrangler d1 execute buzzy-fly_db --file=migrations/0001_init.sql --remote

CREATE TABLE IF NOT EXISTS subscribers (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	email TEXT NOT NULL UNIQUE,
	created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS fulfillments (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	provider TEXT NOT NULL,
	order_id TEXT NOT NULL,
	item_id TEXT NOT NULL,
	customer_email TEXT,
	created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL,
	updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	actor TEXT NOT NULL,
	action TEXT NOT NULL,
	detail TEXT,
	created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fulfillments_created_at ON fulfillments (created_at);
CREATE INDEX IF NOT EXISTS idx_subscribers_created_at ON subscribers (created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log (created_at);
