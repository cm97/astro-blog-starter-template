-- Which tracking link (utm_source / utm_medium / utm_campaign) brought each
-- subscriber and buyer. Stored as "source__medium__campaign"; see
-- src/lib/trafficSource.ts.
--
-- The Worker applies this itself (src/lib/schema.ts, on the hourly cron and
-- before each signup), so running it by hand is optional. ALTER TABLE ... ADD
-- COLUMN is not idempotent in SQLite: if you do run it by hand, run it once.
--   npx wrangler d1 execute buzzy-fly_db --remote --file=./migrations/0007_traffic_sources.sql

ALTER TABLE subscribers ADD COLUMN source TEXT;
ALTER TABLE fulfillments ADD COLUMN source TEXT;
