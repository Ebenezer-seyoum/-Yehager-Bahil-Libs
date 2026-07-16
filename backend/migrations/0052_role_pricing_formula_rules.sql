INSERT INTO global_pricing_rules (rule_key, label, markup_amount_etb, is_active)
VALUES
  ('woman_outfit_addition', 'Women''s Outfit Addition', 6500, true),
  ('men_full_set_addition', 'Men''s Full Set Addition', 6500, true),
  ('men_pants_base', 'Men''s Pants Base Cost', 1700, true),
  ('men_pants_addition', 'Men''s Pants Addition', 4000, true),
  ('men_top_addition', 'Men''s Top Addition', 4000, true),
  ('girl_outfit_addition', 'Girls'' Outfit Addition', 6500, true),
  ('boy_full_set_addition', 'Boys'' Full Set Addition', 6500, true),
  ('boy_pants_base', 'Boys'' Pants Base Cost', 1000, true),
  ('boy_pants_addition', 'Boys'' Pants Addition', 4000, true),
  ('boy_top_addition', 'Boys'' Top Addition', 4000, true)
ON CONFLICT (rule_key) DO UPDATE
SET label = EXCLUDED.label, is_active = true, updated_at = now();

UPDATE global_pricing_rules
SET is_active = false, updated_at = now()
WHERE rule_key NOT IN (
  'woman_outfit_addition',
  'men_full_set_addition',
  'men_pants_base',
  'men_pants_addition',
  'men_top_addition',
  'girl_outfit_addition',
  'boy_full_set_addition',
  'boy_pants_base',
  'boy_pants_addition',
  'boy_top_addition'
);
