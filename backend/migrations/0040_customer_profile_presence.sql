ALTER TABLE users
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS profile_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz;

UPDATE users
SET profile_completed_at = COALESCE(profile_completed_at, updated_at)
WHERE role = 'customer'
  AND COALESCE(NULLIF(TRIM(name), ''), '') <> ''
  AND COALESCE(NULLIF(TRIM(phone), ''), '') <> ''
  AND COALESCE(NULLIF(TRIM(address), ''), '') <> '';
