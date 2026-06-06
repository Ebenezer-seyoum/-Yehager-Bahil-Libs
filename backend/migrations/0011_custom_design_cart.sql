ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS uploaded_design_id UUID REFERENCES uploaded_designs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS item_metadata JSONB;

CREATE INDEX IF NOT EXISTS cart_items_uploaded_design_idx ON cart_items (uploaded_design_id);

ALTER TABLE uploaded_designs
  ADD COLUMN IF NOT EXISTS approved_cart_item_id UUID REFERENCES cart_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quoted_price_usd NUMERIC(12, 2);

CREATE INDEX IF NOT EXISTS uploaded_designs_approved_cart_item_idx ON uploaded_designs (approved_cart_item_id);
