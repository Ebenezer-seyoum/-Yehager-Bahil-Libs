ALTER TABLE uploaded_designs
  ADD COLUMN IF NOT EXISTS detail_image_url TEXT;
