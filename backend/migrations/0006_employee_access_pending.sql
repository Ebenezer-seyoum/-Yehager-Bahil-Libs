-- Employee access-pending / unassigned role support

ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS account_status VARCHAR(32) NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS role_status VARCHAR(32) NOT NULL DEFAULT 'assigned',
ADD COLUMN IF NOT EXISTS assigned_role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_status_check;

ALTER TABLE users
ADD CONSTRAINT users_role_status_check
CHECK (role_status IN ('unassigned', 'assigned'));

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_account_status_check;

ALTER TABLE users
ADD CONSTRAINT users_account_status_check
CHECK (account_status IN ('active', 'invited', 'pending'));

-- Important: system 'employee' role should NOT grant access by default.
-- Employees must receive explicit role(s) and/or permissions via admin assignment.
DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.key = 'employee';
