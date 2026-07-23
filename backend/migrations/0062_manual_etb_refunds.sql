ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS refund_status text,
  ADD COLUMN IF NOT EXISTS refund_amount_etb numeric(14, 2),
  ADD COLUMN IF NOT EXISTS refund_proof_url text,
  ADD COLUMN IF NOT EXISTS refund_proof_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_completed_by text;
