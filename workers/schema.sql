-- Buzzyfly D1 schema. Run once: wrangler d1 execute buzzyfly --file=workers/schema.sql

CREATE TABLE IF NOT EXISTS rate (
  k TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  ts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS downloads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT,
  ts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT,
  path TEXT,
  ip TEXT,
  ts INTEGER NOT NULL
);
