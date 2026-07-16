ALTER TABLE products
  ADD COLUMN IF NOT EXISTS estimated_prices JSONB;

UPDATE products
SET estimated_prices = jsonb_build_object(
  'men', COALESCE((
    SELECT (role->>'designerPriceEtb')::numeric
    FROM jsonb_array_elements(COALESCE(products.family_roles, '[]'::jsonb)) AS role
    WHERE role->>'customerType' = 'man' AND role->>'designerPriceEtb' IS NOT NULL
    LIMIT 1
  ), 0),
  'woman', COALESCE((
    SELECT (role->>'designerPriceEtb')::numeric
    FROM jsonb_array_elements(COALESCE(products.family_roles, '[]'::jsonb)) AS role
    WHERE role->>'customerType' = 'woman' AND role->>'designerPriceEtb' IS NOT NULL
    LIMIT 1
  ), 0),
  'boy', COALESCE((
    SELECT (role->>'designerPriceEtb')::numeric
    FROM jsonb_array_elements(COALESCE(products.family_roles, '[]'::jsonb)) AS role
    WHERE role->>'customerType' = 'boy' AND role->>'designerPriceEtb' IS NOT NULL
    LIMIT 1
  ), 0),
  'girl', COALESCE((
    SELECT (role->>'designerPriceEtb')::numeric
    FROM jsonb_array_elements(COALESCE(products.family_roles, '[]'::jsonb)) AS role
    WHERE role->>'customerType' = 'girl' AND role->>'designerPriceEtb' IS NOT NULL
    LIMIT 1
  ), 0)
)
WHERE estimated_prices IS NULL
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(products.family_roles, '[]'::jsonb)) AS role
    WHERE role->>'designerPriceEtb' IS NOT NULL
  );
