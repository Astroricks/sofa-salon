-- Support logs: add status for 已修复 / Dismiss. Records are never deleted, only status updated.
-- Run after 18-support-log-reschedule.sql.

ALTER TABLE support_logs
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'fixed', 'dismissed'));

ALTER TABLE support_logs
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

ALTER TABLE support_logs
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_support_logs_status ON support_logs(status);

-- Admin can update support_logs (e.g. set status to fixed/dismissed)
CREATE POLICY "Admin update support_logs" ON support_logs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );
