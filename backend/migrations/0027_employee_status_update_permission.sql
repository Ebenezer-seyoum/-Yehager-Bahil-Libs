INSERT INTO permissions (key, resource, action, description)
VALUES
  ('employees.status.update', 'employees', 'status.update', 'Activate, deactivate, block, or unblock employee accounts')
ON CONFLICT (key) DO UPDATE SET
  resource = EXCLUDED.resource,
  action = EXCLUDED.action,
  description = EXCLUDED.description;
