-- Audit: one row per badge-relevant screening per user (same filters as migration 27 / attendance_count).
-- attended column: NULL = present (counts), false = 鸽了 (excluded here).

SELECT
  p.display_name,
  p.id AS user_id,
  s.id AS screening_id,
  s.title AS screening_title,
  s.screening_at,
  r.attended,
  r.seat_key
FROM reservations r
JOIN profiles p ON p.id = r.user_id
JOIN screenings s ON s.id = r.screening_id
WHERE COALESCE(r.is_ghost, false) = false
  AND r.attended IS DISTINCT FROM false
  AND s.screening_at < now()
ORDER BY p.display_name, s.screening_at;
