-- Badge attendance counts: SECURITY DEFINER RPCs so aggregates ignore
-- callers' RLS on reservations/screenings (e.g. inactive past screenings).
-- App uses these; returns only (user_id, count); no film PII.

CREATE OR REPLACE FUNCTION public.get_user_attendance_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT COUNT(DISTINCT r.screening_id)::integer
    FROM reservations r
    JOIN screenings s ON s.id = r.screening_id
    WHERE r.user_id = p_user_id
      AND COALESCE(r.is_ghost, false) = false
      AND r.attended IS DISTINCT FROM false
      AND s.screening_at < now()
  ), 0);
$$;

CREATE OR REPLACE FUNCTION public.get_user_attendance_counts(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, attendance_count integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.user_id, COUNT(DISTINCT r.screening_id)::integer
  FROM reservations r
  JOIN screenings s ON s.id = r.screening_id
  WHERE r.user_id = ANY(p_user_ids)
    AND COALESCE(r.is_ghost, false) = false
    AND r.attended IS DISTINCT FROM false
    AND s.screening_at < now()
  GROUP BY r.user_id;
$$;

REVOKE ALL ON FUNCTION public.get_user_attendance_count(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_attendance_counts(uuid[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_user_attendance_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_attendance_counts(uuid[]) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_attendance_count(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_attendance_counts(uuid[]) TO service_role;
