-- Refine mandatory employee role templates for the current admin flow.
-- Idempotent: safe for existing databases and new installs.

INSERT INTO roles (key, name, description, is_system)
VALUES
  ('super_admin', 'Super Admin', 'Full access to every dashboard area, role, permission, and security setting.', FALSE),
  ('admin_manager', 'Admin Manager', 'Broad daily operations access for managers without direct database/system ownership.', FALSE),
  ('order_manager', 'Order Manager', 'Manage customer orders, order status, documents, and customer order support.', FALSE),
  ('custom_design_reviewer', 'Custom Design Reviewer', 'Review custom design submissions, approve quotes, and decline unsuitable requests.', FALSE),
  ('payment_verifier', 'Payment Verifier', 'Review payments, verify bank or QR payments, refunds, exchange rates, and payment documents.', FALSE),
  ('product_manager', 'Product Manager', 'Manage catalog products, sections, inventory, images, and product availability.', FALSE),
  ('customer_support', 'Customer Support', 'Handle support inbox, customer questions, and order/customer follow-up.', FALSE),
  ('tailor_measurement_staff', 'Tailor / Measurement Staff', 'Review measurements, tailoring documents, and production-related order progress.', FALSE),
  ('delivery_staff', 'Delivery Staff', 'Track delivery-ready orders, delivery documents, and fulfillment status.', FALSE),
  ('reports_analyst', 'Reports Analyst', 'View and export business reports and audit summaries.', FALSE)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_system = FALSE,
  updated_at = NOW();

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'super_admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'dashboard.view',
  'employees.view', 'employees.create', 'employees.edit', 'roles.view', 'roles.assign',
  'customers.view', 'customers.create', 'customers.edit',
  'products.view', 'products.create', 'products.edit', 'products.delete', 'products.stock.update',
  'orders.view', 'orders.create', 'orders.edit', 'orders.status.update',
  'payments.view', 'payments.verify',
  'documents.view', 'documents.upload', 'documents.approve',
  'uploaded_designs.view', 'uploaded_designs.review',
  'exchange.view', 'exchange.edit',
  'reports.view', 'reports.export',
  'support.view', 'support.reply', 'support.assign', 'support.resolve',
  'settings.view',
  'notifications.view', 'activity.view', 'alerts.view', 'alerts.manage', 'audit.view'
)
WHERE r.key = 'admin_manager'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'dashboard.view',
  'orders.view', 'orders.edit', 'orders.status.update',
  'customers.view',
  'documents.view', 'documents.upload',
  'support.view', 'support.reply',
  'reports.view',
  'notifications.view', 'activity.view'
)
WHERE r.key = 'order_manager'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'dashboard.view',
  'uploaded_designs.view', 'uploaded_designs.review',
  'customers.view',
  'orders.view',
  'support.view', 'support.reply',
  'notifications.view', 'activity.view'
)
WHERE r.key = 'custom_design_reviewer'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'dashboard.view',
  'payments.view', 'payments.verify', 'payments.refund',
  'exchange.view', 'exchange.edit',
  'documents.view', 'documents.upload',
  'orders.view',
  'reports.view', 'reports.export',
  'notifications.view', 'activity.view'
)
WHERE r.key = 'payment_verifier'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'dashboard.view',
  'products.view', 'products.create', 'products.edit', 'products.delete', 'products.stock.update',
  'reports.view', 'reports.export',
  'notifications.view', 'activity.view'
)
WHERE r.key = 'product_manager'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'dashboard.view',
  'support.view', 'support.reply', 'support.assign', 'support.resolve',
  'customers.view',
  'orders.view',
  'notifications.view', 'activity.view'
)
WHERE r.key = 'customer_support'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'dashboard.view',
  'orders.view', 'orders.status.update',
  'documents.view', 'documents.upload',
  'customers.view',
  'notifications.view', 'activity.view'
)
WHERE r.key = 'tailor_measurement_staff'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'dashboard.view',
  'orders.view', 'orders.status.update',
  'documents.view', 'documents.upload',
  'support.view',
  'notifications.view', 'activity.view'
)
WHERE r.key = 'delivery_staff'
ON CONFLICT DO NOTHING;

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
