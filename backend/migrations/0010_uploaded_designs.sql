CREATE TABLE IF NOT EXISTS uploaded_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(320) NOT NULL,
  customer_name TEXT NOT NULL,
  design_title TEXT NOT NULL,
  inspiration_note TEXT,
  front_image_url TEXT NOT NULL,
  side_image_url TEXT,
  back_image_url TEXT,
  fabric_type TEXT,
  embroidery_style TEXT,
  color_preference TEXT,
  measurement_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  contact_phone TEXT,
  contact_telegram TEXT,
  contact_address JSONB,
  status VARCHAR(32) NOT NULL DEFAULT 'submitted',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_reason TEXT,
  submitted_at TIMESTAMPTZ,
  approved_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  email_placeholder_status VARCHAR(40),
  email_placeholder_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS uploaded_designs_user_email_idx ON uploaded_designs (user_email);
CREATE INDEX IF NOT EXISTS uploaded_designs_status_idx ON uploaded_designs (status);
CREATE INDEX IF NOT EXISTS uploaded_designs_created_at_idx ON uploaded_designs (created_at);

INSERT INTO permissions (key, resource, action, description)
VALUES
  ('uploaded_designs.view', 'uploaded_designs', 'view', 'View uploaded design submissions'),
  ('uploaded_designs.review', 'uploaded_designs', 'review', 'Approve or reject uploaded designs')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN ('uploaded_designs.view', 'uploaded_designs.review')
WHERE r.key IN ('super_admin', 'admin_manager', 'order_manager')
ON CONFLICT DO NOTHING;
