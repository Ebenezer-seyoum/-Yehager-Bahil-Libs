CREATE TABLE IF NOT EXISTS "employee_profiles" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "first_name" varchar(120) NOT NULL,
  "father_name" varchar(120) NOT NULL,
  "grandfather_name" varchar(120),
  "gender" varchar(20) NOT NULL,
  "date_of_birth" timestamptz,
  "marital_status" varchar(30),
  "country" varchar(120),
  "city" varchar(120),
  "address" text,
  "employment_type" varchar(30),
  "start_date" timestamptz,
  "invite_status" varchar(30) NOT NULL DEFAULT 'none',
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "employee_profiles_user_id_idx" ON "employee_profiles" ("user_id");

