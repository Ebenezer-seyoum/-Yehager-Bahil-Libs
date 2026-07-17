DROP TABLE IF EXISTS system_settings;

CREATE TABLE IF NOT EXISTS dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  top_bar_color VARCHAR(7) NOT NULL DEFAULT '#0f172a',
  sidebar_color VARCHAR(7) NOT NULL DEFAULT '#0f172a',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
