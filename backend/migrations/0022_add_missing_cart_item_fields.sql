ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "item_type" text DEFAULT 'product' NOT NULL;
ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "uploaded_design_id" uuid;
ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "item_metadata" jsonb;
