CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(320) NOT NULL UNIQUE,
  name TEXT,
  role VARCHAR(32) NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  region TEXT NOT NULL,
  subcategory TEXT,
  category TEXT,
  price_usd NUMERIC(12,2) NOT NULL,
  groom_price_usd NUMERIC(12,2),
  is_couple BOOLEAN NOT NULL DEFAULT FALSE,
  family_roles JSONB,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  fabric_type TEXT,
  embroidery_style TEXT,
  gender TEXT NOT NULL,
  unique_id TEXT,
  tailoring_days INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(320),
  gender TEXT NOT NULL,
  chest NUMERIC(10,2) NOT NULL,
  waist NUMERIC(10,2) NOT NULL,
  hips NUMERIC(10,2) NOT NULL,
  shoulder_width NUMERIC(10,2) NOT NULL,
  arm_length NUMERIC(10,2) NOT NULL,
  torso_length NUMERIC(10,2) NOT NULL,
  inseam NUMERIC(10,2),
  neck NUMERIC(10,2),
  label TEXT NOT NULL DEFAULT 'My Measurements',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_email VARCHAR(320) NOT NULL,
  owner_name TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  event_code TEXT NOT NULL UNIQUE,
  shipping_address JSONB,
  event_date TIMESTAMP,
  message TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_name TEXT,
  lead_email VARCHAR(320) NOT NULL,
  lead_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(320) NOT NULL,
  customer_name TEXT NOT NULL,
  items JSONB NOT NULL,
  total_usd NUMERIC(12,2) NOT NULL,
  shipping_cost_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL DEFAULT 'stripe_usd',
  payment_currency TEXT NOT NULL DEFAULT 'USD',
  total_etb NUMERIC(14,2),
  etb_exchange_rate NUMERIC(12,4),
  payment_proof_url TEXT,
  payment_proof_uploaded_at TIMESTAMPTZ,
  fulfillment_type TEXT NOT NULL DEFAULT 'mail',
  carrier TEXT,
  pickup_location TEXT,
  pickup_person_name TEXT,
  pickup_person_phone TEXT,
  pickup_id_url TEXT,
  pickup_id_uploaded_at TIMESTAMPTZ,
  pickup_signed_doc_url TEXT,
  pickup_signed_doc_uploaded_at TIMESTAMPTZ,
  pickup_proof_url TEXT,
  pickup_proof_uploaded_at TIMESTAMPTZ,
  pickup_completed_at TIMESTAMPTZ,
  shipping_document_url TEXT,
  shipping_doc_uploaded_at TIMESTAMPTZ,
  shipping_documents JSONB,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  event_name TEXT,
  shipping_address JSONB,
  use_event_owner_address BOOLEAN NOT NULL DEFAULT FALSE,
  measurement_id UUID REFERENCES measurements(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relation TEXT,
  gender TEXT NOT NULL,
  measurements JSONB,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  product_image TEXT,
  price_usd NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_email VARCHAR(320) NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  price_usd NUMERIC(12,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  measurement_id UUID REFERENCES measurements(id) ON DELETE SET NULL,
  measurement_snapshot JSONB,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  event_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_name TEXT,
  participant_email VARCHAR(320) NOT NULL,
  participant_name TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_status TEXT NOT NULL DEFAULT 'browsing',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_pair TEXT NOT NULL UNIQUE DEFAULT 'USD_ETB',
  rate NUMERIC(14,6) NOT NULL,
  source TEXT,
  last_updated TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  performed_by TEXT,
  details TEXT,
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system_error',
  severity TEXT NOT NULL DEFAULT 'warning',
  entity_id TEXT,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS products_region_idx ON products(region);
CREATE INDEX IF NOT EXISTS products_active_idx ON products(is_active);
CREATE INDEX IF NOT EXISTS measurements_user_idx ON measurements(user_id);
CREATE INDEX IF NOT EXISTS family_members_group_idx ON family_members(family_group_id);
CREATE INDEX IF NOT EXISTS cart_items_user_email_idx ON cart_items(user_email);
CREATE INDEX IF NOT EXISTS orders_user_email_idx ON orders(user_email);
CREATE INDEX IF NOT EXISTS event_participants_event_idx ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS audit_logs_category_idx ON audit_logs(category);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS system_alerts_resolved_idx ON system_alerts(is_resolved);
