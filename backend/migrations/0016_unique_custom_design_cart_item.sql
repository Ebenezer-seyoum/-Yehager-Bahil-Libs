CREATE UNIQUE INDEX IF NOT EXISTS cart_items_unique_uploaded_design_idx
  ON cart_items (uploaded_design_id)
  WHERE uploaded_design_id IS NOT NULL;
