ALTER TABLE "cart_items" ADD COLUMN "item_type" text DEFAULT 'product' NOT NULL;
ALTER TABLE "cart_items" ADD COLUMN "uploaded_design_id" uuid;
ALTER TABLE "cart_items" ADD COLUMN "item_metadata" jsonb;
