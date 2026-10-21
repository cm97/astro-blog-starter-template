-- Admin inbox (/admin/inbox): mail sent to @buzzyfly.com addresses that
-- Cloudflare Email Routing hands to this Worker's `email` handler.
-- Attachments live in the MY_PRODUCTS R2 bucket under `inbox/` and are only
-- served to a signed-in admin.
--
-- The Worker creates these tables itself (src/lib/inbox.ts, ensureInboxSchema),
-- so running this by hand is optional:
--   npx wrangler d1 execute buzzy-fly_db --remote --file=./migrations/0011_inbox.sql

CREATE TABLE IF NOT EXISTS inbox_messages (
	id           INTEGER PRIMARY KEY AUTOINCREMENT,
	message_id   TEXT,              -- Message-ID header, used to thread replies
	references_h TEXT,              -- References header of the incoming mail
	from_address TEXT    NOT NULL,
	from_name    TEXT    NOT NULL DEFAULT '',
	reply_to     TEXT,              -- Reply-To address, if the sender set one
	to_address   TEXT    NOT NULL,  -- the @buzzyfly.com address it was sent to
	subject      TEXT    NOT NULL DEFAULT '',
	text_body    TEXT    NOT NULL DEFAULT '',
	html_body    TEXT,
	received_at  INTEGER NOT NULL,
	read_at      INTEGER,
	archived     INTEGER NOT NULL DEFAULT 0,
	replied_at   INTEGER
);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_folder ON inbox_messages (archived, received_at);

CREATE TABLE IF NOT EXISTS inbox_attachments (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	message_id INTEGER NOT NULL,  -- inbox_messages.id
	filename   TEXT    NOT NULL,
	mime_type  TEXT    NOT NULL,
	size       INTEGER NOT NULL,
	r2_key     TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_inbox_attachments_message ON inbox_attachments (message_id);
