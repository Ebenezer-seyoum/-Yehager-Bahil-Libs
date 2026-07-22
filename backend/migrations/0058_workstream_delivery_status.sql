ALTER TABLE order_workstreams
  ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(40) NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS delivery_carrier TEXT,
  ADD COLUMN IF NOT EXISTS delivery_tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS delivery_status_changed_by TEXT,
  ADD COLUMN IF NOT EXISTS delivery_status_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_due_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS order_workstreams_delivery_status_idx
  ON order_workstreams(delivery_status);
