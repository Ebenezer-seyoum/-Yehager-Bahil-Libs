CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(160) NOT NULL UNIQUE,
  category VARCHAR(60) NOT NULL,
  value JSONB,
  value_type VARCHAR(20) NOT NULL DEFAULT 'string',
  description TEXT,
  is_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS system_settings_category_idx ON system_settings(category);
