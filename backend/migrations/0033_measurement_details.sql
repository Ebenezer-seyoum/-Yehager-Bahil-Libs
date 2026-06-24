ALTER TABLE measurements
  ADD COLUMN IF NOT EXISTS measurement_details JSONB NOT NULL DEFAULT '{}'::jsonb;
