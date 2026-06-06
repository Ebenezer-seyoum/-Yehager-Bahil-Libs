ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

UPDATE users
SET role = 'customer'
WHERE role IS NULL
   OR role NOT IN ('admin', 'customer', 'employee');

ALTER TABLE users
ALTER COLUMN role SET DEFAULT 'customer';

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('admin', 'customer', 'employee'));
