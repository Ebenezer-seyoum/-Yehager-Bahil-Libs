-- Track password reset requests and status metadata.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "password_status" varchar(40) DEFAULT 'never_reset' NOT NULL,
  ADD COLUMN IF NOT EXISTS "last_password_reset_requested_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "last_password_reset_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "last_password_reset_method" varchar(40);

CREATE TABLE IF NOT EXISTS "password_reset_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "password_reset_requests_user_id_idx" ON "password_reset_requests" ("user_id");
CREATE INDEX IF NOT EXISTS "password_reset_requests_expires_at_idx" ON "password_reset_requests" ("expires_at");
