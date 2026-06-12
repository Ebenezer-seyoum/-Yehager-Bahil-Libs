import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Client } from "pg";
import { config } from "dotenv";

config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

async function run() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const migrationPath = path.resolve(process.cwd(), "migrations", "0023_homepage_sections.sql");
    const sql = await readFile(migrationPath, "utf8");
    await client.query(sql);
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'homepage_sections' AND column_name = 'subsections'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'homepage_sections' AND column_name = 'collections'
        ) THEN
          ALTER TABLE homepage_sections RENAME COLUMN subsections TO collections;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'homepage_sections' AND column_name = 'collections'
        ) THEN
          ALTER TABLE homepage_sections ADD COLUMN collections jsonb DEFAULT '[]'::jsonb NOT NULL;
        END IF;
      END $$;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(
      "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING",
      ["0023_homepage_sections.sql"],
    );
    await client.query(
      "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING",
      ["0024_homepage_sections_collections.sql"],
    );
    console.log("homepage_sections ready");
  } finally {
    await client.end();
  }
}

void run();
