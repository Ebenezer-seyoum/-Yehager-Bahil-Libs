CREATE TABLE IF NOT EXISTS homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  slug varchar(160) NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  collections jsonb DEFAULT '[]'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS homepage_sections_slug_unique ON homepage_sections USING btree (slug);
CREATE INDEX IF NOT EXISTS homepage_sections_active_idx ON homepage_sections USING btree (is_active);
CREATE INDEX IF NOT EXISTS homepage_sections_sort_idx ON homepage_sections USING btree (sort_order);
