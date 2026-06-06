ALTER TABLE family_groups
  ALTER COLUMN event_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS group_type TEXT NOT NULL DEFAULT 'family_group',
  ADD COLUMN IF NOT EXISTS selection_type TEXT,
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS product_image TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_design_id UUID REFERENCES uploaded_designs(id) ON DELETE SET NULL;

ALTER TABLE family_members
  ALTER COLUMN event_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS measurement_id UUID REFERENCES measurements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS selection_type TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_design_id UUID REFERENCES uploaded_designs(id) ON DELETE SET NULL;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS selection_type TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_design_id UUID REFERENCES uploaded_designs(id) ON DELETE SET NULL;

ALTER TABLE uploaded_designs
  ADD COLUMN IF NOT EXISTS family_group_id UUID REFERENCES family_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS family_groups_uploaded_design_idx ON family_groups (uploaded_design_id);
CREATE INDEX IF NOT EXISTS family_members_measurement_idx ON family_members (measurement_id);
