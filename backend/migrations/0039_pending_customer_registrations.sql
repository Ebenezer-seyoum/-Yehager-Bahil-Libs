CREATE TABLE IF NOT EXISTS pending_customer_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(320) NOT NULL,
  name varchar(255),
  password_hash text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  resend_available_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pending_customer_registrations_email_unique
  ON pending_customer_registrations(email);

CREATE INDEX IF NOT EXISTS pending_customer_registrations_expires_at_idx
  ON pending_customer_registrations(expires_at);
