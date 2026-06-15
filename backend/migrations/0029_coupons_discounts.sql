CREATE TABLE IF NOT EXISTS product_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  discount_type varchar(32) NOT NULL DEFAULT 'percentage',
  discount_value numeric(12, 2) NOT NULL,
  scope varchar(32) NOT NULL DEFAULT 'all_products',
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  region text,
  category text,
  subcategory text,
  status varchar(32) NOT NULL DEFAULT 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  max_redemptions integer,
  redemption_count integer NOT NULL DEFAULT 0,
  internal_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_discounts_type_check CHECK (discount_type IN ('percentage', 'fixed_amount')),
  CONSTRAINT product_discounts_scope_check CHECK (scope IN ('all_products', 'product', 'region', 'category', 'subcategory')),
  CONSTRAINT product_discounts_status_check CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'expired'))
);

CREATE INDEX IF NOT EXISTS product_discounts_status_idx ON product_discounts(status);
CREATE INDEX IF NOT EXISTS product_discounts_product_id_idx ON product_discounts(product_id);

CREATE TABLE IF NOT EXISTS coupon_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(64) NOT NULL,
  name text NOT NULL,
  discount_type varchar(32) NOT NULL DEFAULT 'percentage',
  discount_value numeric(12, 2) NOT NULL,
  applies_to varchar(32) NOT NULL DEFAULT 'all_orders',
  minimum_order_usd numeric(12, 2),
  max_discount_usd numeric(12, 2),
  usage_limit integer,
  per_customer_limit integer NOT NULL DEFAULT 1,
  redemption_count integer NOT NULL DEFAULT 0,
  status varchar(32) NOT NULL DEFAULT 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  internal_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupon_codes_code_unique UNIQUE (code),
  CONSTRAINT coupon_codes_type_check CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping')),
  CONSTRAINT coupon_codes_applies_to_check CHECK (applies_to IN ('all_orders', 'catalog_orders', 'custom_orders')),
  CONSTRAINT coupon_codes_status_check CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'expired', 'used_up'))
);

CREATE INDEX IF NOT EXISTS coupon_codes_status_idx ON coupon_codes(status);
