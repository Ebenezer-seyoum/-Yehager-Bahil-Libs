ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS delivery_status_changed_by TEXT,
  ADD COLUMN IF NOT EXISTS delivery_status_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_timeline JSONB NOT NULL DEFAULT '[]'::jsonb;
