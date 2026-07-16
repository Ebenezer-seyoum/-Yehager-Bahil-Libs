ALTER TABLE products
  ADD COLUMN IF NOT EXISTS approved_estimated_prices JSONB;

UPDATE products
SET approved_estimated_prices = estimated_prices
WHERE approved_estimated_prices IS NULL
  AND price_status IN ('approved', 'published')
  AND estimated_prices IS NOT NULL;

ALTER TABLE global_pricing_rules
  ADD COLUMN IF NOT EXISTS scope_type VARCHAR(20) NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS scope_key VARCHAR(400) NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS tribe_name TEXT,
  ADD COLUMN IF NOT EXISTS region_name TEXT;

ALTER TABLE global_pricing_rules
  DROP CONSTRAINT IF EXISTS global_pricing_rules_rule_key_key;

DROP INDEX IF EXISTS global_pricing_rules_key_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS global_pricing_rules_scope_rule_uidx
  ON global_pricing_rules(scope_key, rule_key);

CREATE INDEX IF NOT EXISTS global_pricing_rules_scope_idx
  ON global_pricing_rules(scope_type, tribe_name, region_name);

