ALTER TABLE products
  ADD COLUMN IF NOT EXISTS designer_price_etb NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS markup_amount_etb NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS price_status VARCHAR(40) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS send_to_telegram BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telegram_status VARCHAR(40) NOT NULL DEFAULT 'not_sent',
  ADD COLUMN IF NOT EXISTS telegram_message_id TEXT,
  ADD COLUMN IF NOT EXISTS price_deadline TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS products_price_status_idx ON products(price_status);

CREATE TABLE IF NOT EXISTS global_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key VARCHAR(80) NOT NULL UNIQUE,
  label VARCHAR(160) NOT NULL,
  markup_amount_etb NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO global_pricing_rules (rule_key, label)
VALUES
  ('men_top', 'Men''s Top'),
  ('men_full_set', 'Men''s Full Set'),
  ('men_pants', 'Men''s Pants'),
  ('boy_top', 'Boy''s Top'),
  ('boy_full_set', 'Boy''s Full Set'),
  ('boy_pants', 'Boy''s Pants'),
  ('woman_outfit', 'Woman''s Outfit'),
  ('girl_outfit', 'Girl''s Outfit')
ON CONFLICT (rule_key) DO NOTHING;
