-- Audit: badge-relevant count per user (same logic as get_user_attendance_count).
-- No profiles column — compare to reservations if debugging.

SELECT
  p.id AS user_id,
  p.display_name,
  public.get_user_attendance_count(p.id) AS badge_attendance_count
FROM profiles p
WHERE public.get_user_attendance_count(p.id) > 0
ORDER BY badge_attendance_count DESC, display_name
LIMIT 500;
