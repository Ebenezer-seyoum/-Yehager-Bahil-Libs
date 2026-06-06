ALTER TABLE uploaded_designs
  ADD COLUMN IF NOT EXISTS estimated_delivery_label TEXT,
  ADD COLUMN IF NOT EXISTS estimated_delivery_days_min INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_delivery_days_max INTEGER;
