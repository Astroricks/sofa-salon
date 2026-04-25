-- Optional view for ad-hoc SQL / ops. App reads badge counts via migration 27 RPCs.
--
-- A screening counts when:
--   * non-ghost reservation (is_ghost is not true)
--   * past screening (screening_at < now())
--   * not marked 鸽了 (reservations.attended is distinct from false)
--
-- security_invoker = off so aggregates are not filtered by callers' RLS on
-- reservations / screenings (e.g. inactive past screenings).

CREATE OR REPLACE VIEW public.user_attendance_counts AS
SELECT r.user_id,
       COUNT(DISTINCT r.screening_id)::integer AS attendance_count
FROM reservations r
JOIN screenings s ON s.id = r.screening_id
WHERE COALESCE(r.is_ghost, false) = false
  AND r.attended IS DISTINCT FROM false
  AND s.screening_at < now()
GROUP BY r.user_id;

ALTER VIEW public.user_attendance_counts SET (security_invoker = off);

GRANT SELECT ON public.user_attendance_counts TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations (user_id);
CREATE INDEX IF NOT EXISTS idx_screenings_screening_at ON screenings (screening_at);
