INSERT INTO permissions (key, resource, action, description)
VALUES
  ('documents.update', 'documents', 'update', 'Replace uploaded order documents'),
  ('documents.delete', 'documents', 'delete', 'Remove uploaded order documents'),
  ('documents.download', 'documents', 'download', 'Download generated and uploaded order documents')
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
  AND p.key IN ('documents.update', 'documents.delete', 'documents.download')
ON CONFLICT DO NOTHING;
