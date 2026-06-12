DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'homepage_sections'
      AND column_name = 'subsections'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'homepage_sections'
      AND column_name = 'collections'
  ) THEN
    ALTER TABLE "homepage_sections" RENAME COLUMN "subsections" TO "collections";
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'homepage_sections'
      AND column_name = 'collections'
  ) THEN
    ALTER TABLE "homepage_sections" ADD COLUMN "collections" jsonb DEFAULT '[]'::jsonb NOT NULL;
  END IF;
END $$;
