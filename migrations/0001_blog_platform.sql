-- Registered-user blog platform: accounts, sessions, and reader-authored posts.
--
-- Apply locally with:
--   npx wrangler d1 migrations apply DB --local
-- Apply to the production database with:
--   npx wrangler d1 migrations apply DB --remote

CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY,
	email TEXT NOT NULL UNIQUE,
	username TEXT NOT NULL UNIQUE,
	display_name TEXT NOT NULL,
	password_hash TEXT NOT NULL,
	password_salt TEXT NOT NULL,
	created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
	-- SHA-256 hash (hex) of the bearer token stored in the session cookie.
	-- The raw token is never persisted.
	token_hash TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	created_at INTEGER NOT NULL,
	expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS posts (
	id TEXT PRIMARY KEY,
	author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	title TEXT NOT NULL,
	slug TEXT NOT NULL UNIQUE,
	body_markdown TEXT NOT NULL,
	-- R2 object keys under the BLOG_MEDIA bucket, or NULL when not attached.
	cover_image_key TEXT,
	video_key TEXT,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
