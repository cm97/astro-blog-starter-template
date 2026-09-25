-- Names someone asked Buzzyfly to follow up on from /domains.
CREATE TABLE IF NOT EXISTS domain_leads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  domain     TEXT NOT NULL,
  email      TEXT NOT NULL,
  note       TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_domain_leads_created_at
  ON domain_leads (created_at);
