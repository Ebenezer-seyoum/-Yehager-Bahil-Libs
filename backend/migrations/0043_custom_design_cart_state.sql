ALTER TABLE "uploaded_designs" ADD COLUMN IF NOT EXISTS "cart_removed_at" timestamp with time zone;
