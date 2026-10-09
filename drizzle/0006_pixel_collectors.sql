-- Public pixel routing identifiers are not authentication credentials.
-- These events remain anonymous and cannot authorize customer outreach.
CREATE TABLE IF NOT EXISTS pixel_collectors (
  shop TEXT PRIMARY KEY,
  collector_key TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  last_received_at TEXT,
  quota_day TEXT NOT NULL DEFAULT '',
  quota_count INTEGER NOT NULL DEFAULT 0,
  quota_minute TEXT NOT NULL DEFAULT '',
  minute_count INTEGER NOT NULL DEFAULT 0
);
