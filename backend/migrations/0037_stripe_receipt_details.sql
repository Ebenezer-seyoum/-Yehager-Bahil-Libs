ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_status TEXT,
  ADD COLUMN IF NOT EXISTS stripe_amount_received NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS stripe_currency TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_email TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_name TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_brand TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_last4 TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_funding TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_country TEXT,
  ADD COLUMN IF NOT EXISTS stripe_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS stripe_refund_status TEXT,
  ADD COLUMN IF NOT EXISTS stripe_refund_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS stripe_receipt_metadata JSONB;

CREATE INDEX IF NOT EXISTS orders_stripe_payment_intent_idx ON orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS orders_stripe_charge_idx ON orders(stripe_charge_id);
