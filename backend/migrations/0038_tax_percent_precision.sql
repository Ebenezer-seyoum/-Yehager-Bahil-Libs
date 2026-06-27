ALTER TABLE profit_cost_settings
  ALTER COLUMN tax_percent TYPE numeric(8, 4)
  USING tax_percent::numeric(8, 4);
