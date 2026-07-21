CREATE TABLE IF NOT EXISTS order_workstreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  workstream_type VARCHAR(16) NOT NULL,
  tracking_reference TEXT NOT NULL,
  status VARCHAR(40) NOT NULL,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_status_changed_by TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_workstreams_type_check CHECK (workstream_type IN ('catalog', 'custom'))
);

CREATE UNIQUE INDEX IF NOT EXISTS order_workstreams_order_type_unique
  ON order_workstreams(order_id, workstream_type);
CREATE UNIQUE INDEX IF NOT EXISTS order_workstreams_tracking_reference_unique
  ON order_workstreams(tracking_reference);
CREATE INDEX IF NOT EXISTS order_workstreams_type_status_idx
  ON order_workstreams(workstream_type, status);
CREATE INDEX IF NOT EXISTS order_workstreams_assigned_user_idx
  ON order_workstreams(assigned_user_id);

CREATE TABLE IF NOT EXISTS order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  workstream_id UUID NOT NULL REFERENCES order_workstreams(id) ON DELETE CASCADE,
  source_cart_item_id UUID,
  position INTEGER NOT NULL DEFAULT 1,
  item_type TEXT NOT NULL DEFAULT 'product',
  product_id UUID,
  uploaded_design_id UUID,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  line_total_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  measurement_id UUID,
  measurement_snapshot JSONB,
  item_metadata JSONB,
  status VARCHAR(40) NOT NULL,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_line_items_order_idx ON order_line_items(order_id);
CREATE INDEX IF NOT EXISTS order_line_items_workstream_idx ON order_line_items(workstream_id);
CREATE INDEX IF NOT EXISTS order_line_items_type_status_idx ON order_line_items(item_type, status);
CREATE UNIQUE INDEX IF NOT EXISTS order_line_items_order_cart_item_unique
  ON order_line_items(order_id, source_cart_item_id)
  WHERE source_cart_item_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS order_workstream_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  workstream_id UUID NOT NULL REFERENCES order_workstreams(id) ON DELETE CASCADE,
  from_status VARCHAR(40),
  to_status VARCHAR(40) NOT NULL,
  version INTEGER NOT NULL,
  event_key TEXT NOT NULL,
  changed_by TEXT,
  customer_email_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  customer_email_sent_at TIMESTAMPTZ,
  customer_email_attempts INTEGER NOT NULL DEFAULT 0,
  customer_email_last_error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_workstream_events_email_status_check
    CHECK (customer_email_status IN ('pending', 'sent', 'failed', 'skipped'))
);

CREATE UNIQUE INDEX IF NOT EXISTS order_workstream_events_event_key_unique
  ON order_workstream_events(event_key);
CREATE INDEX IF NOT EXISTS order_workstream_events_workstream_idx
  ON order_workstream_events(workstream_id, created_at);
CREATE INDEX IF NOT EXISTS order_workstream_events_order_idx
  ON order_workstream_events(order_id, created_at);

WITH item_classification AS (
  SELECT
    orders.id AS order_id,
    BOOL_OR(
      COALESCE(item.value->>'uploaded_design_id', item.value->>'uploadedDesignId', '') <> ''
      OR LOWER(COALESCE(item.value->>'item_type', item.value->>'itemType', item.value->>'type', ''))
        IN ('custom', 'custom_design', 'custom-design', 'uploaded_design')
    ) AS has_custom,
    BOOL_OR(NOT (
      COALESCE(item.value->>'uploaded_design_id', item.value->>'uploadedDesignId', '') <> ''
      OR LOWER(COALESCE(item.value->>'item_type', item.value->>'itemType', item.value->>'type', ''))
        IN ('custom', 'custom_design', 'custom-design', 'uploaded_design')
    )) AS has_catalog
  FROM orders
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(orders.items, '[]'::jsonb)) AS item(value)
  GROUP BY orders.id
)
UPDATE orders
SET order_type = CASE
  WHEN item_classification.has_catalog AND item_classification.has_custom THEN 'mixed_order'
  WHEN item_classification.has_custom THEN 'custom_order'
  ELSE 'catalog_order'
END
FROM item_classification
WHERE orders.id = item_classification.order_id;

WITH classified_items AS (
  SELECT
    orders.id AS order_id,
    orders.order_number,
    orders.status AS order_status,
    orders.created_at,
    orders.updated_at,
    CASE
      WHEN COALESCE(item.value->>'uploaded_design_id', item.value->>'uploadedDesignId', '') <> ''
        OR LOWER(COALESCE(item.value->>'item_type', item.value->>'itemType', item.value->>'type', ''))
          IN ('custom', 'custom_design', 'custom-design', 'uploaded_design')
      THEN 'custom'
      ELSE 'catalog'
    END AS workstream_type
  FROM orders
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(orders.items, '[]'::jsonb)) AS item(value)
), distinct_workstreams AS (
  SELECT DISTINCT order_id, order_number, order_status, created_at, updated_at, workstream_type
  FROM classified_items
)
INSERT INTO order_workstreams (
  order_id,
  workstream_type,
  tracking_reference,
  status,
  started_at,
  completed_at,
  last_status_changed_at,
  last_status_changed_by,
  created_at,
  updated_at
)
SELECT
  order_id,
  workstream_type,
  order_number || CASE WHEN workstream_type = 'custom' THEN '-CUS' ELSE '-CAT' END,
  CASE
    WHEN order_status = 'cancelled' THEN 'cancelled'
    WHEN order_status IN ('fulfilled', 'shipped', 'delivered', 'ready_for_pickup', 'picked_up') THEN 'ready'
    WHEN order_status = 'quality_check' THEN 'quality_check'
    WHEN workstream_type = 'custom' AND order_status = 'tailoring' THEN 'tailoring'
    WHEN workstream_type = 'custom' AND order_status = 'processing' THEN 'measurements_confirmed'
    WHEN workstream_type = 'custom' THEN 'design_review'
    WHEN order_status IN ('processing', 'tailoring') THEN 'picking'
    ELSE 'pending'
  END,
  CASE WHEN order_status NOT IN ('pending') THEN updated_at ELSE NULL END,
  CASE WHEN order_status IN ('fulfilled', 'shipped', 'delivered', 'ready_for_pickup', 'picked_up', 'cancelled') THEN updated_at ELSE NULL END,
  updated_at,
  'migration_0057',
  created_at,
  updated_at
FROM distinct_workstreams
ON CONFLICT (order_id, workstream_type) DO NOTHING;

WITH expanded_items AS (
  SELECT
    orders.id AS order_id,
    item.value AS item,
    item.ordinality::INTEGER AS position,
    CASE
      WHEN COALESCE(item.value->>'uploaded_design_id', item.value->>'uploadedDesignId', '') <> ''
        OR LOWER(COALESCE(item.value->>'item_type', item.value->>'itemType', item.value->>'type', ''))
          IN ('custom', 'custom_design', 'custom-design', 'uploaded_design')
      THEN 'custom'
      ELSE 'catalog'
    END AS workstream_type
  FROM orders
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(orders.items, '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality)
), normalized_items AS (
  SELECT
    expanded_items.*,
    COALESCE(item->>'cart_item_id', item->>'cartItemId', '') AS raw_cart_item_id,
    COALESCE(item->>'product_id', item->>'productId', '') AS raw_product_id,
    COALESCE(item->>'uploaded_design_id', item->>'uploadedDesignId', '') AS raw_uploaded_design_id,
    COALESCE(item->>'measurement_id', item->>'measurementId', '') AS raw_measurement_id,
    COALESCE(item->>'unit_price_usd', item->>'unitPriceUsd', item->>'price_usd', item->>'priceUsd', item->>'price', '0') AS raw_unit_price,
    COALESCE(item->>'line_total_usd', item->>'lineTotalUsd', item->>'total_usd', item->>'totalUsd', '0') AS raw_line_total,
    COALESCE(item->>'quantity', item->>'qty', '1') AS raw_quantity
  FROM expanded_items
)
INSERT INTO order_line_items (
  order_id,
  workstream_id,
  source_cart_item_id,
  position,
  item_type,
  product_id,
  uploaded_design_id,
  product_name,
  quantity,
  unit_price_usd,
  line_total_usd,
  measurement_id,
  measurement_snapshot,
  item_metadata,
  status,
  created_at,
  updated_at
)
SELECT
  normalized_items.order_id,
  order_workstreams.id,
  CASE WHEN raw_cart_item_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN raw_cart_item_id::UUID END,
  position,
  COALESCE(NULLIF(item->>'item_type', ''), NULLIF(item->>'itemType', ''), 'product'),
  CASE WHEN raw_product_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN raw_product_id::UUID END,
  CASE WHEN raw_uploaded_design_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN raw_uploaded_design_id::UUID END,
  COALESCE(NULLIF(item->>'product_name', ''), NULLIF(item->>'productName', ''), NULLIF(item->>'name', ''), 'Order item'),
  CASE WHEN raw_quantity ~ '^[0-9]+$' THEN GREATEST(raw_quantity::INTEGER, 1) ELSE 1 END,
  CASE WHEN raw_unit_price ~ '^-?[0-9]+(\.[0-9]+)?$' THEN raw_unit_price::NUMERIC ELSE 0 END,
  CASE
    WHEN raw_line_total ~ '^-?[0-9]+(\.[0-9]+)?$' AND raw_line_total::NUMERIC <> 0 THEN raw_line_total::NUMERIC
    WHEN raw_unit_price ~ '^-?[0-9]+(\.[0-9]+)?$' AND raw_quantity ~ '^[0-9]+$' THEN raw_unit_price::NUMERIC * GREATEST(raw_quantity::INTEGER, 1)
    ELSE 0
  END,
  CASE WHEN raw_measurement_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN raw_measurement_id::UUID END,
  COALESCE(item->'measurement_snapshot', item->'measurementSnapshot'),
  COALESCE(item->'item_metadata', item->'itemMetadata'),
  order_workstreams.status,
  order_workstreams.created_at,
  order_workstreams.updated_at
FROM normalized_items
JOIN order_workstreams
  ON order_workstreams.order_id = normalized_items.order_id
 AND order_workstreams.workstream_type = normalized_items.workstream_type
ON CONFLICT DO NOTHING;
