-- First-party funnel counts for /admin/funnel: page views and buy-button
-- clicks per day, page and traffic source. Counts only: no cookies, no IP
-- addresses, no visitor ids. Paid orders come from the fulfillments table.
--
-- The Worker creates this table itself (src/lib/schema.ts, ensureFunnelSchema),
-- so running it by hand is optional:
--   npx wrangler d1 execute buzzy-fly_db --remote --file=./migrations/0010_funnel_events.sql

CREATE TABLE IF NOT EXISTS funnel_daily (
	day    TEXT    NOT NULL, -- YYYY-MM-DD (UTC)
	event  TEXT    NOT NULL, -- "view" | "buy_click"
	path   TEXT    NOT NULL,
	source TEXT    NOT NULL, -- "source__medium__campaign" or "direct"
	count  INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (day, event, path, source)
);
