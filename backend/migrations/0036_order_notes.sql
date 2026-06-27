CREATE TABLE IF NOT EXISTS "order_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE cascade,
  "note_type" varchar(32) NOT NULL,
  "note" text NOT NULL,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "created_by_name" text,
  "created_by_email" varchar(320),
  "created_by_role" text,
  "edited_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "order_notes_type_check" CHECK ("note_type" IN ('customer', 'admin', 'tailor', 'delivery')),
  CONSTRAINT "order_notes_length_check" CHECK (char_length(trim("note")) BETWEEN 3 AND 1000)
);

CREATE INDEX IF NOT EXISTS "order_notes_order_idx" ON "order_notes" ("order_id");
CREATE INDEX IF NOT EXISTS "order_notes_type_idx" ON "order_notes" ("note_type");
CREATE INDEX IF NOT EXISTS "order_notes_deleted_idx" ON "order_notes" ("deleted_at");

INSERT INTO permissions (key, resource, action, description)
VALUES
  ('order_notes.view', 'order_notes', 'view', 'View internal order notes'),
  ('order_notes.admin.create', 'order_notes', 'admin.create', 'Add admin order notes'),
  ('order_notes.tailor.create', 'order_notes', 'tailor.create', 'Add tailor and production order notes'),
  ('order_notes.delivery.create', 'order_notes', 'delivery.create', 'Add shipping and delivery order notes'),
  ('order_notes.manage', 'order_notes', 'manage', 'Edit or delete order nnotes')
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
    'order_notes.view',
    'order_notes.admin.create',
    'order_notes.tailor.create',
    'order_notes.delivery.create',
    'order_notes.manage'
  )
ON CONFLICT DO NOTHING;
