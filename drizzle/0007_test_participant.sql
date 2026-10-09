-- A real, explicitly enrolled owner trial. Never seeded shopper behaviour.
CREATE TABLE IF NOT EXISTS test_participants (
  id TEXT PRIMARY KEY, shop TEXT NOT NULL, email TEXT NOT NULL,
  consent TEXT NOT NULL, created_at TEXT NOT NULL,
  UNIQUE(shop,email)
);
CREATE TABLE IF NOT EXISTS test_participant_messages (
  id TEXT PRIMARY KEY, participant_id TEXT NOT NULL REFERENCES test_participants(id),
  purpose TEXT NOT NULL, subject TEXT NOT NULL, message TEXT NOT NULL,
  status TEXT NOT NULL, provider_id TEXT, created_at TEXT NOT NULL,
  checked_at TEXT, UNIQUE(participant_id,purpose)
);
CREATE TABLE IF NOT EXISTS test_participant_links (
  participant_id TEXT NOT NULL REFERENCES test_participants(id),
  shopify_customer_id TEXT NOT NULL, order_reference TEXT NOT NULL,
  checked_at TEXT NOT NULL, PRIMARY KEY(participant_id,order_reference)
);
