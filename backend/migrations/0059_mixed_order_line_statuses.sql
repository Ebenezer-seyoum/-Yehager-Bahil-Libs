ALTER TABLE order_line_items
  ADD COLUMN IF NOT EXISTS last_status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_status_changed_by TEXT,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS order_line_item_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  workstream_id UUID NOT NULL REFERENCES order_workstreams(id) ON DELETE CASCADE,
  line_item_id UUID NOT NULL REFERENCES order_line_items(id) ON DELETE CASCADE,
  from_status VARCHAR(40),
  to_status VARCHAR(40) NOT NULL,
  version INTEGER NOT NULL,
  event_key TEXT NOT NULL,
  changed_by TEXT,
  note TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS order_line_item_events_event_key_unique
  ON order_line_item_events(event_key);
CREATE UNIQUE INDEX IF NOT EXISTS order_line_item_events_line_version_unique
  ON order_line_item_events(line_item_id, version);
CREATE INDEX IF NOT EXISTS order_line_item_events_line_idx
  ON order_line_item_events(line_item_id, created_at);
CREATE INDEX IF NOT EXISTS order_line_item_events_workstream_idx
  ON order_line_item_events(workstream_id, created_at);
CREATE INDEX IF NOT EXISTS order_line_item_events_order_idx
  ON order_line_item_events(order_id, created_at);

-- Normalize only mixed-order workstreams. Pure catalog/custom orders retain their
-- existing parent state and continue through the legacy admin-state controls.
UPDATE order_workstreams AS workstream
SET
  status = CASE
    WHEN workstream.status = 'design_review' THEN 'pending'
    WHEN workstream.status IN ('measurements_confirmed', 'picking') THEN 'processing'
    WHEN workstream.status = 'ready' THEN 'fulfilled'
    WHEN workstream.status IN ('pending', 'processing', 'tailoring', 'quality_check', 'fulfilled', 'cancelled')
      THEN workstream.status
    ELSE 'pending'
  END,
  last_status_changed_at = NOW(),
  last_status_changed_by = COALESCE(workstream.last_status_changed_by, 'migration_0059'),
  updated_at = NOW()
FROM orders AS parent_order
WHERE parent_order.id = workstream.order_id
  AND parent_order.order_type = 'mixed_order';

UPDATE order_line_items AS line_item
SET
  status = CASE
    WHEN line_item.status = 'design_review' THEN 'pending'
    WHEN line_item.status IN ('measurements_confirmed', 'picking') THEN 'processing'
    WHEN line_item.status = 'ready' THEN 'fulfilled'
    WHEN line_item.status IN ('pending', 'processing', 'tailoring', 'quality_check', 'fulfilled', 'cancelled')
      THEN line_item.status
    ELSE workstream.status
  END,
  last_status_changed_at = NOW(),
  last_status_changed_by = COALESCE(line_item.last_status_changed_by, 'migration_0059'),
  updated_at = NOW()
FROM order_workstreams AS workstream
JOIN orders AS parent_order ON parent_order.id = workstream.order_id
WHERE line_item.workstream_id = workstream.id
  AND parent_order.order_type = 'mixed_order';

-- The workstream status is the slowest active line. Cancelled lines are ignored
-- unless every line in the workstream is cancelled.
WITH line_rollups AS (
  SELECT
    line_item.workstream_id,
    CASE
      WHEN COUNT(*) FILTER (WHERE line_item.status <> 'cancelled') = 0 THEN 'cancelled'
      WHEN MIN(
        CASE line_item.status
          WHEN 'pending' THEN 0
          WHEN 'processing' THEN 1
          WHEN 'tailoring' THEN 2
          WHEN 'quality_check' THEN 3
          WHEN 'fulfilled' THEN 4
          ELSE 0
        END
      ) FILTER (WHERE line_item.status <> 'cancelled') = 0 THEN 'pending'
      WHEN MIN(
        CASE line_item.status
          WHEN 'pending' THEN 0
          WHEN 'processing' THEN 1
          WHEN 'tailoring' THEN 2
          WHEN 'quality_check' THEN 3
          WHEN 'fulfilled' THEN 4
          ELSE 0
        END
      ) FILTER (WHERE line_item.status <> 'cancelled') = 1 THEN 'processing'
      WHEN MIN(
        CASE line_item.status
          WHEN 'pending' THEN 0
          WHEN 'processing' THEN 1
          WHEN 'tailoring' THEN 2
          WHEN 'quality_check' THEN 3
          WHEN 'fulfilled' THEN 4
          ELSE 0
        END
      ) FILTER (WHERE line_item.status <> 'cancelled') = 2 THEN 'tailoring'
      WHEN MIN(
        CASE line_item.status
          WHEN 'pending' THEN 0
          WHEN 'processing' THEN 1
          WHEN 'tailoring' THEN 2
          WHEN 'quality_check' THEN 3
          WHEN 'fulfilled' THEN 4
          ELSE 0
        END
      ) FILTER (WHERE line_item.status <> 'cancelled') = 3 THEN 'quality_check'
      ELSE 'fulfilled'
    END AS rolled_status
  FROM order_line_items AS line_item
  JOIN orders AS parent_order ON parent_order.id = line_item.order_id
  WHERE parent_order.order_type = 'mixed_order'
  GROUP BY line_item.workstream_id
)
UPDATE order_workstreams AS workstream
SET
  status = line_rollups.rolled_status,
  updated_at = NOW()
FROM line_rollups
WHERE workstream.id = line_rollups.workstream_id;

-- Customer main status is the slowest active workstream production state until
-- production is fulfilled. Thereafter the parent-level raw delivery state is
-- translated to the exact customer status vocabulary.
WITH production_rollups AS (
  SELECT
    workstream.order_id,
    CASE
      WHEN COUNT(*) FILTER (WHERE workstream.status <> 'cancelled') = 0 THEN 'cancelled'
      WHEN MIN(
        CASE workstream.status
          WHEN 'pending' THEN 0
          WHEN 'processing' THEN 1
          WHEN 'tailoring' THEN 2
          WHEN 'quality_check' THEN 3
          WHEN 'fulfilled' THEN 4
          ELSE 0
        END
      ) FILTER (WHERE workstream.status <> 'cancelled') = 0 THEN 'pending'
      WHEN MIN(
        CASE workstream.status
          WHEN 'pending' THEN 0
          WHEN 'processing' THEN 1
          WHEN 'tailoring' THEN 2
          WHEN 'quality_check' THEN 3
          WHEN 'fulfilled' THEN 4
          ELSE 0
        END
      ) FILTER (WHERE workstream.status <> 'cancelled') = 1 THEN 'processing'
      WHEN MIN(
        CASE workstream.status
          WHEN 'pending' THEN 0
          WHEN 'processing' THEN 1
          WHEN 'tailoring' THEN 2
          WHEN 'quality_check' THEN 3
          WHEN 'fulfilled' THEN 4
          ELSE 0
        END
      ) FILTER (WHERE workstream.status <> 'cancelled') = 2 THEN 'tailoring'
      WHEN MIN(
        CASE workstream.status
          WHEN 'pending' THEN 0
          WHEN 'processing' THEN 1
          WHEN 'tailoring' THEN 2
          WHEN 'quality_check' THEN 3
          WHEN 'fulfilled' THEN 4
          ELSE 0
        END
      ) FILTER (WHERE workstream.status <> 'cancelled') = 3 THEN 'quality_check'
      ELSE 'fulfilled'
    END AS production_status
  FROM order_workstreams AS workstream
  JOIN orders AS parent_order ON parent_order.id = workstream.order_id
  WHERE parent_order.order_type = 'mixed_order'
  GROUP BY workstream.order_id
)
UPDATE orders AS parent_order
SET
  status = CASE
    WHEN production_rollups.production_status <> 'fulfilled' THEN production_rollups.production_status
    WHEN parent_order.payment_status <> 'paid' THEN 'processing'
    WHEN parent_order.delivery_status IN ('returned', 'cancelled_pickup') THEN 'cancelled'
    WHEN parent_order.delivery_status IN ('delivered', 'picked_up') THEN 'delivered'
    WHEN parent_order.fulfillment_type = 'pickup'
      AND parent_order.delivery_status IN ('ready_for_pickup', 'customer_notified', 'waiting_customer')
      THEN 'ready_for_pickup'
    WHEN parent_order.fulfillment_type <> 'pickup'
      AND parent_order.delivery_status IN (
        'assigned_to_ems',
        'handed_to_ems',
        'in_transit',
        'at_hub',
        'out_for_delivery',
        'failed_attempt'
      )
      THEN 'shipped'
    ELSE 'fulfilled'
  END,
  updated_at = NOW()
FROM production_rollups
WHERE parent_order.id = production_rollups.order_id
  AND parent_order.order_type = 'mixed_order';

INSERT INTO order_line_item_events (
  order_id,
  workstream_id,
  line_item_id,
  from_status,
  to_status,
  version,
  event_key,
  changed_by,
  metadata,
  created_at,
  updated_at
)
SELECT
  line_item.order_id,
  line_item.workstream_id,
  line_item.id,
  NULL,
  line_item.status,
  line_item.version,
  'migration_0059:' || line_item.id::TEXT || ':' || line_item.version::TEXT,
  'migration_0059',
  jsonb_build_object('status_kind', 'production', 'baseline', TRUE),
  NOW(),
  NOW()
FROM order_line_items AS line_item
JOIN orders AS parent_order ON parent_order.id = line_item.order_id
WHERE parent_order.order_type = 'mixed_order'
ON CONFLICT DO NOTHING;
