CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE users
ADD CONSTRAINT users_status_check
CHECK (status IN ('active', 'inactive', 'suspended'));

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(150) NOT NULL UNIQUE,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  remember_me BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

INSERT INTO roles (key, name, description, is_system)
VALUES
  ('admin', 'Admin', 'Full administrative access', TRUE),
  ('employee', 'Employee', 'Operational staff access', TRUE),
  ('customer', 'Customer', 'Storefront customer account', TRUE)
ON CONFLICT (key) DO NOTHING;

INSERT INTO permissions (key, resource, action, description)
VALUES
  ('dashboard.view', 'dashboard', 'view', 'View dashboard'),
  ('employees.view', 'employees', 'view', 'View employees'),
  ('employees.create', 'employees', 'create', 'Create employees'),
  ('employees.edit', 'employees', 'edit', 'Edit employees'),
  ('employees.delete', 'employees', 'delete', 'Delete employees'),
  ('employees.assign', 'employees', 'assign', 'Assign employee roles'),
  ('roles.view', 'roles', 'view', 'View roles'),
  ('roles.create', 'roles', 'create', 'Create roles'),
  ('roles.edit', 'roles', 'edit', 'Edit roles'),
  ('roles.delete', 'roles', 'delete', 'Delete roles'),
  ('roles.assign', 'roles', 'assign', 'Assign roles'),
  ('roles.manage', 'roles', 'manage', 'Manage roles and permissions'),
  ('products.view', 'products', 'view', 'View products'),
  ('products.create', 'products', 'create', 'Create products'),
  ('products.edit', 'products', 'edit', 'Edit products'),
  ('products.delete', 'products', 'delete', 'Delete products'),
  ('products.manage', 'products', 'manage', 'Manage products'),
  ('orders.view', 'orders', 'view', 'View orders'),
  ('orders.edit', 'orders', 'edit', 'Edit orders'),
  ('orders.manage', 'orders', 'manage', 'Manage orders'),
  ('reports.view', 'reports', 'view', 'View reports'),
  ('reports.manage', 'reports', 'manage', 'Manage reports'),
  ('settings.view', 'settings', 'view', 'View settings'),
  ('settings.manage', 'settings', 'manage', 'Manage settings'),
  ('audit.view', 'audit', 'view', 'View audit logs'),
  ('alerts.view', 'alerts', 'view', 'View alerts'),
  ('alerts.manage', 'alerts', 'manage', 'Manage alerts')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
  ON p.key IN ('dashboard.view', 'products.view', 'orders.view', 'alerts.view')
WHERE r.key = 'employee'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.key = u.role
ON CONFLICT DO NOTHING;
