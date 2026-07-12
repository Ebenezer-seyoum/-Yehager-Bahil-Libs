ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "production_materials" jsonb DEFAULT '[]'::jsonb NOT NULL;
