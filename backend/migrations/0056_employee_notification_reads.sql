CREATE TABLE IF NOT EXISTS system_alert_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES system_alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS system_alert_reads_alert_user_unique
  ON system_alert_reads(alert_id, user_id);

CREATE INDEX IF NOT EXISTS system_alert_reads_user_idx
  ON system_alert_reads(user_id);
