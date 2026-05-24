-- Expand permission catalog to cover admin dashboard modules.

INSERT INTO permissions (key, resource, action, description)
VALUES
  ('customers.view', 'customers', 'view', 'View customers'),
  ('customers.create', 'customers', 'create', 'Create customers'),
  ('customers.edit', 'customers', 'edit', 'Edit customers'),

  ('products.stock.update', 'products', 'stock.update', 'Update product stock'),

  ('orders.create', 'orders', 'create', 'Create orders'),
  ('orders.delete', 'orders', 'delete', 'Delete orders'),
  ('orders.status.update', 'orders', 'status.update', 'Update order status'),

  ('payments.view', 'payments', 'view', 'View payments'),
  ('payments.verify', 'payments', 'verify', 'Verify payments'),
  ('payments.refund', 'payments', 'refund', 'Process refunds'),

  ('documents.view', 'documents', 'view', 'View order documents'),
  ('documents.upload', 'documents', 'upload', 'Upload order documents'),
  ('documents.approve', 'documents', 'approve', 'Approve order documents'),

  ('exchange.view', 'exchange', 'view', 'View exchange rates'),
  ('exchange.edit', 'exchange', 'edit', 'Edit exchange rates'),

  ('reports.export', 'reports', 'export', 'Export reports'),

  ('support.view', 'support', 'view', 'View support inbox'),
  ('support.reply', 'support', 'reply', 'Reply to support messages'),
  ('support.assign', 'support', 'assign', 'Assign support tickets'),
  ('support.resolve', 'support', 'resolve', 'Resolve support tickets'),

  ('settings.edit', 'settings', 'edit', 'Edit settings'),

  ('notifications.view', 'notifications', 'view', 'View notifications'),
  ('activity.view', 'activity', 'view', 'View activity logs')
ON CONFLICT (key) DO NOTHING;

