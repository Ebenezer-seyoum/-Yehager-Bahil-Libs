ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price_amount numeric(12,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_exchange_rate numeric(12,4);

-- Repair products created by the previous selector implementation. Those rows
-- recorded ETB amounts in the USD columns, so normalize them once using the
-- currently configured USD_ETB rate while preserving the entered amount.
UPDATE products p
SET
  base_price_amount = p.price_usd,
  base_exchange_rate = r.rate,
  price_usd = ROUND((p.price_usd / r.rate)::numeric, 2)
FROM exchange_rates r
WHERE p.base_currency = 'ETB'
  AND r.currency_pair = 'USD_ETB'
  AND p.base_price_amount IS NULL;

UPDATE products p
SET family_roles = (
  SELECT jsonb_agg(
    CASE
      WHEN role->>'currency' = 'ETB' AND role->>'enteredPrice' IS NULL THEN
        jsonb_set(
          jsonb_set(
            jsonb_set(role, '{enteredPrice}', to_jsonb((role->>'price')::numeric)),
            '{price}', to_jsonb(ROUND(((role->>'price')::numeric / r.rate)::numeric, 2))
          ),
          '{exchangeRate}', to_jsonb(r.rate)
        )
      ELSE role
    END
  )
  FROM jsonb_array_elements(p.family_roles) AS role
)
FROM exchange_rates r
WHERE p.family_roles IS NOT NULL
  AND r.currency_pair = 'USD_ETB'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p.family_roles) AS role
    WHERE role->>'currency' = 'ETB' AND role->>'enteredPrice' IS NULL
  );
