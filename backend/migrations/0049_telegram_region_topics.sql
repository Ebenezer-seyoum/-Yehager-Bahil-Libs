ALTER TABLE products
  ADD COLUMN IF NOT EXISTS telegram_topic_id TEXT;

CREATE TABLE IF NOT EXISTS telegram_region_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_name VARCHAR(160) NOT NULL,
  telegram_group_id TEXT NOT NULL,
  telegram_topic_id TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT telegram_region_topics_group_region_uidx UNIQUE (telegram_group_id, region_name)
);
