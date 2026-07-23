ALTER TABLE products
  ADD COLUMN IF NOT EXISTS size_options jsonb NOT NULL DEFAULT '[]'::jsonb;
