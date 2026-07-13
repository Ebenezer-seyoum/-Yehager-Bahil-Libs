ALTER TABLE "support_tickets"
  ADD COLUMN IF NOT EXISTS "source" varchar(50) NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS "email_thread_key" text;

ALTER TABLE "support_messages"
  ADD COLUMN IF NOT EXISTS "email_message_id" text,
  ADD COLUMN IF NOT EXISTS "email_in_reply_to" text,
  ADD COLUMN IF NOT EXISTS "email_references" text,
  ADD COLUMN IF NOT EXISTS "email_uid" integer,
  ADD COLUMN IF NOT EXISTS "email_mailbox" text,
  ADD COLUMN IF NOT EXISTS "email_subject" text;

CREATE INDEX IF NOT EXISTS "support_tickets_email_thread_key_idx"
  ON "support_tickets" USING btree ("email_thread_key");

CREATE UNIQUE INDEX IF NOT EXISTS "support_messages_email_message_id_unique"
  ON "support_messages" USING btree ("email_message_id");
