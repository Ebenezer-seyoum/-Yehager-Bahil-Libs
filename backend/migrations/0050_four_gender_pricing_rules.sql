INSERT INTO global_pricing_rules (rule_key, label, markup_amount_etb, is_active)
SELECT 'men', 'Men', COALESCE((SELECT markup_amount_etb FROM global_pricing_rules WHERE rule_key = 'men_full_set'), 0), true
UNION ALL
SELECT 'woman', 'Woman', COALESCE((SELECT markup_amount_etb FROM global_pricing_rules WHERE rule_key = 'woman_outfit'), 0), true
UNION ALL
SELECT 'boy', 'Boy', COALESCE((SELECT markup_amount_etb FROM global_pricing_rules WHERE rule_key = 'boy_full_set'), 0), true
UNION ALL
SELECT 'girl', 'Girl', COALESCE((SELECT markup_amount_etb FROM global_pricing_rules WHERE rule_key = 'girl_outfit'), 0), true
ON CONFLICT (rule_key) DO UPDATE
SET label = EXCLUDED.label, is_active = true, updated_at = now();

UPDATE global_pricing_rules
SET is_active = false, updated_at = now()
WHERE rule_key IN ('men_top', 'men_full_set', 'men_pants', 'boy_top', 'boy_full_set', 'boy_pants', 'woman_outfit', 'girl_outfit');
