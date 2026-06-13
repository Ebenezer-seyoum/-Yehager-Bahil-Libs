INSERT INTO permissions (key, resource, action, description)
VALUES ('customers.delete', 'customers', 'delete', 'Delete customers')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'admin'
  AND p.key = 'customers.delete'
ON CONFLICT DO NOTHING;
