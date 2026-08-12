-- Admin console: sessions, editable page content, and site-wide settings.
-- Apply with:
--   npx wrangler d1 execute buzzy-fly_db --remote --file=./migrations/0001_admin_console.sql
-- (drop --remote to apply to your local dev D1 copy instead)

CREATE TABLE IF NOT EXISTS admin_sessions (
	token_hash TEXT PRIMARY KEY,
	created_at INTEGER NOT NULL,
	expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS site_content (
	slug TEXT PRIMARY KEY,
	title TEXT,
	description TEXT,
	hero_image TEXT,
	body TEXT,
	updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS site_settings (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL,
	updated_at INTEGER NOT NULL
);
