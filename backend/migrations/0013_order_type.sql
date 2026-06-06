ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'catalog_order';

CREATE INDEX IF NOT EXISTS orders_order_type_idx ON orders (order_type);

UPDATE orders
SET order_type = 'group_order'
WHERE event_id IS NOT NULL
  AND order_type = 'catalog_order';

UPDATE orders
SET order_type = 'custom_design_order'
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(items) AS item
  WHERE item->>'item_type' = 'custom_design'
     OR item ? 'uploaded_design_id'
)
  AND order_type = 'catalog_order';
