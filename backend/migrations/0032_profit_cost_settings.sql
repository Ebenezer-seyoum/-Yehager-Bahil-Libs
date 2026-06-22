CREATE TABLE IF NOT EXISTS profit_cost_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type varchar(40) NOT NULL,
  entity_id text NOT NULL DEFAULT 'default',
  product_cost_usd numeric(12, 2) NOT NULL DEFAULT 0,
  tax_percent numeric(6, 2) NOT NULL DEFAULT 0,
  designer_cost_usd numeric(12, 2) NOT NULL DEFAULT 0,
  other_cost_usd numeric(12, 2) NOT NULL DEFAULT 0,
  designer_payment_policy varchar(32) NOT NULL DEFAULT 'none',
  designer_payment_status varchar(32) NOT NULL DEFAULT 'unpaid',
  designer_paid_usd numeric(12, 2) NOT NULL DEFAULT 0,
  internal_note text,
  updated_by varchar(320),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profit_cost_settings_entity_type_check CHECK (entity_type IN ('default', 'product', 'custom_order')),
  CONSTRAINT profit_cost_settings_designer_policy_check CHECK (designer_payment_policy IN ('none', 'fifty_fifty', 'paid_100')),
  CONSTRAINT profit_cost_settings_designer_status_check CHECK (designer_payment_status IN ('unpaid', 'advance_paid', 'fully_paid'))
);

CREATE UNIQUE INDEX IF NOT EXISTS profit_cost_settings_entity_unique ON profit_cost_settings(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS profit_cost_settings_entity_idx ON profit_cost_settings(entity_type, entity_id);
