CREATE TABLE IF NOT EXISTS owner_recovery_messages (
 id TEXT PRIMARY KEY,
 participant_id TEXT NOT NULL REFERENCES test_participants(id),
 shop TEXT NOT NULL,
 order_reference TEXT NOT NULL,
 order_updated_at TEXT NOT NULL,
 purpose TEXT NOT NULL DEFAULT 'owner_cancellation_support',
 evidence_json TEXT NOT NULL,
 draft_json TEXT,
 status TEXT NOT NULL,
 provider_id TEXT,
 created_at TEXT NOT NULL,
 checked_at TEXT,
 UNIQUE(shop, order_reference, purpose)
);
