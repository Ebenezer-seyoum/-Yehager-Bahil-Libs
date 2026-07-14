ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS rate_type text NOT NULL DEFAULT 'market_reference';
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS updated_by text;
