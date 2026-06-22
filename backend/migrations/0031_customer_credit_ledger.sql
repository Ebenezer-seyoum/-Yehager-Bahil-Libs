CREATE TABLE IF NOT EXISTS customer_credit_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  minimum_paid_usd numeric(12, 2) NOT NULL,
  reward_usd numeric(12, 2) NOT NULL,
  applies_to varchar(32) NOT NULL DEFAULT 'all_orders',
  status varchar(32) NOT NULL DEFAULT 'active',
  internal_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_credit_rules_applies_to_check CHECK (applies_to IN ('all_orders', 'catalog_orders', 'custom_orders')),
  CONSTRAINT customer_credit_rules_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE INDEX IF NOT EXISTS customer_credit_rules_status_idx ON customer_credit_rules(status);

CREATE TABLE IF NOT EXISTS customer_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  user_email varchar(320) NOT NULL,
  customer_name text,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  order_number text,
  rule_id uuid REFERENCES customer_credit_rules(id) ON DELETE SET NULL,
  amount_usd numeric(12, 2) NOT NULL,
  balance_after_usd numeric(12, 2),
  type varchar(40) NOT NULL,
  reason text NOT NULL,
  created_by varchar(320) NOT NULL DEFAULT 'system',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_credit_ledger_type_check CHECK (type IN ('bonus_credit', 'credit_used'))
);

CREATE INDEX IF NOT EXISTS customer_credit_ledger_user_email_idx ON customer_credit_ledger(user_email);
CREATE INDEX IF NOT EXISTS customer_credit_ledger_user_id_idx ON customer_credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS customer_credit_ledger_order_id_idx ON customer_credit_ledger(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS customer_credit_ledger_order_rule_type_unique
  ON customer_credit_ledger(order_id, rule_id, type);
