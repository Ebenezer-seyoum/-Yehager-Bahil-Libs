ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS subtotal_usd numeric(12, 2),
  ADD COLUMN IF NOT EXISTS discount_amount_usd numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_code varchar(64),
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES coupon_codes(id) ON DELETE SET NULL;
