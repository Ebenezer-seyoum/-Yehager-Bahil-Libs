INSERT INTO permissions (key, resource, action, description)
VALUES
  ('returns.view', 'returns', 'view', 'View returns and refund requests'),
  ('returns.edit', 'returns', 'edit', 'Approve, reject, and update returns or refunds'),
  ('shipping.view', 'shipping', 'view', 'View shipping and delivery operations'),
  ('shipping.edit', 'shipping', 'edit', 'Update shipping and delivery status'),
  ('transactions.view', 'transactions', 'view', 'View payment transactions'),
  ('transactions.edit', 'transactions', 'edit', 'Update transaction review state'),
  ('coupons.view', 'coupons', 'view', 'View coupons and discounts'),
  ('coupons.edit', 'coupons', 'edit', 'Create and update coupons and discounts'),
  ('backup.view', 'backup', 'view', 'View backup and restore status'),
  ('backup.edit', 'backup', 'edit', 'Create backups and run restore workflow')
ON CONFLICT (key) DO UPDATE
SET
  resource = EXCLUDED.resource,
  action = EXCLUDED.action,
  description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.is_system = true
  AND r.key = 'admin'
  AND p.key IN (
    'returns.view',
    'returns.edit',
    'shipping.view',
    'shipping.edit',
    'transactions.view',
    'transactions.edit',
    'coupons.view',
    'coupons.edit',
    'backup.view',
    'backup.edit'
  )
ON CONFLICT DO NOTHING;
