-- Ensure each user receives at most one pre-screening reminder per screening.
-- The cron route uses the row as a delivery claim before sending. Run once in
-- Supabase SQL Editor after the earlier numbered migrations.

CREATE TABLE IF NOT EXISTS event_reminder_deliveries (
  screening_id UUID NOT NULL REFERENCES screenings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  PRIMARY KEY (screening_id, user_id)
);

ALTER TABLE event_reminder_deliveries ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE event_reminder_deliveries IS
  'Idempotency and delivery tracking for one pre-screening reminder per user.';
