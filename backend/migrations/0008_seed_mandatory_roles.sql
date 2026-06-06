-- Seed mandatory business roles (non-system) and their permissions.

INSERT INTO roles (key, name, description, is_system)
VALUES
  ('super_admin', 'Super Admin', 'Full access to everything.', FALSE),
  ('admin_manager', 'Admin / Manager', 'Manage daily ecommerce operations.', FALSE),
  ('catalog_manager', 'Product / Catalog Manager', 'Manage products, sections, inventory, and images.', FALSE),
  ('order_manager', 'Order Manager', 'Manage customer orders and order status.', FALSE),
  ('finance_staff', 'Finance / Payment Staff', 'Manage payments, refunds, exchange rates, and financial reports.', FALSE),
  ('support_staff', 'Support Staff', 'Handle customer messages, tickets, and replies.', FALSE),
  ('delivery_staff', 'Delivery Staff', 'Handle delivery-ready orders and delivery status.', FALSE),
  ('tailor_staff', 'Tailor / Measurement Staff', 'Handle measurements and tailoring review.', FALSE),
  ('reports_analyst', 'Reports Analyst', 'View reports and export analytics.', FALSE)
ON CONFLICT (key) DO NOTHING;

-- Helper: assign all permissions to Super Admin.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'super_admin'
ON CONFLICT DO NOTHING;

-- Admin / Manager (broad ops access, but not roles.manage / settings.manage).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'dashboard.view',
  'employees.view',
  'customers.view', 'customers.create', 'customers.edit',
  'products.view', 'products.create', 'products.edit', 'products.delete', 'products.stock.update',
  'orders.view', 'orders.create', 'orders.edit', 'orders.status.update',
  'payments.view',
  'documents.view', 'documents.upload',
  'exchange.view',
  'reports.view', 'reports.export',
  'support.view', 'support.reply', 'support.assign', 'support.resolve',
  'notifications.view',
  'activity.view',
  'audit.view',
  'alerts.view'
)
WHERE r.key = 'admin_manager'
ON CONFLICT DO NOTHING;

-- Catalog Manager.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'dashboard.view',
  'products.view', 'products.create', 'products.edit', 'products.delete', 'products.stock.update',
  'reports.view', 'reports.export',
  'notifications.view',
  'activity.view'
)
WHERE r.key = 'catalog_manager'
ON CONFLICT DO NOTHING;

-- Order Manager.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'dashboard.view',
  'orders.view', 'orders.edit', 'orders.status.update',
  'customers.view',
  'documents.view', 'documents.upload',
  'reports.view', 'reports.export',
  'support.view', 'support.reply',
  'notifications.view',
  'activity.view'
)
WHERE r.key = 'order_manager'
ON CONFLICT DO NOTHING;

-- Finance staff.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'dashboard.view',
  'payments.view', 'payments.verify', 'payments.refund',
  'exchange.view', 'exchange.edit',
  'documents.view', 'documents.upload',
  'reports.view', 'reports.export',
  'support.view', 'support.reply',
  'notifications.view',
  'activity.view'
)
WHERE r.key = 'finance_staff'
ON CONFLICT DO NOTHING;

-- Support staff.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'dashboard.view',
  'support.view', 'support.reply', 'support.assign', 'support.resolve',
  'customers.view',
  'orders.view',
  'reports.view', 'reports.export',
  'notifications.view',
  'activity.view'
)
WHERE r.key = 'support_staff'
ON CONFLICT DO NOTHING;

-- Delivery staff.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'dashboard.view',
  'orders.view', 'orders.status.update',
  'documents.view', 'documents.upload',
  'support.view',
  'reports.view', 'reports.export',
  'notifications.view',
  'activity.view'
)
WHERE r.key = 'delivery_staff'
ON CONFLICT DO NOTHING;

-- Tailor staff.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'dashboard.view',
  'orders.view', 'orders.status.update',
  'documents.view', 'documents.upload',
  'customers.view',
  'support.view',
  'reports.view',
  'notifications.view',
  'activity.view'
)
WHERE r.key = 'tailor_staff'
ON CONFLICT DO NOTHING;

-- Reports analyst.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'dashboard.view',
  'reports.view', 'reports.export',
  'audit.view',
  'activity.view'
)
WHERE r.key = 'reports_analyst'
ON CONFLICT DO NOTHING;

