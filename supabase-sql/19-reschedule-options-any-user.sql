-- Allow any authenticated user to add reschedule options (max 5 per proposal enforced in API).
-- Run after 18-support-log-reschedule.sql.

DROP POLICY IF EXISTS "Insert reschedule_option" ON reschedule_options;
CREATE POLICY "Insert reschedule_option" ON reschedule_options
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
