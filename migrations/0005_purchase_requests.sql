-- Orders asked for by email when there is no card checkout for that product yet.
CREATE TABLE IF NOT EXISTS purchase_requests (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  price      TEXT NOT NULL,
  email      TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
