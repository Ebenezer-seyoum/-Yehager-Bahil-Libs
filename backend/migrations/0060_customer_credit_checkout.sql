ALTER TABLE orders ADD COLUMN IF NOT EXISTS credit_used_usd numeric(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE customer_credit_rules DROP CONSTRAINT IF EXISTS customer_credit_rules_applies_to_check;
ALTER TABLE customer_credit_rules ADD CONSTRAINT customer_credit_rules_applies_to_check CHECK (applies_to IN ('all_orders', 'catalog_orders', 'custom_orders', 'other_orders'));

UPDATE customer_credit_rules
SET applies_to = 'other_orders'
WHERE applies_to IN ('all_orders', 'catalog_orders');
