-- Manual: mark a guest 鸽了 (no-show) for one screening — matches admin Guests PATCH attended=false.
-- Run in Supabase SQL Editor. Review steps 1–2 before step 3.
--
-- Edit display_name and screening title below (or use user_id / screening_id from step 1).
-- Lucy · 对她说 Hable con ella

-- ========== 1. Resolve user ==========
SELECT id AS user_id, display_name, no_show_count, consecutive_attendances
FROM profiles
WHERE display_name ILIKE 'Lucy'
ORDER BY display_name;

-- ========== 2. Resolve screening ==========
SELECT id AS screening_id, title, title_en, screening_at
FROM screenings
WHERE title ILIKE '%对她说%'
   OR title ILIKE '%Hable con ella%'
   OR title = '对她说 Hable con ella'
ORDER BY screening_at DESC;

-- ========== 3. Preflight: Lucy's reservation(s) on this screening ==========
WITH target AS (
  SELECT
    (SELECT id FROM profiles WHERE display_name ILIKE 'Lucy' ORDER BY display_name LIMIT 1) AS user_id,
    (
      SELECT id
      FROM screenings
      WHERE title = '对她说 Hable con ella'
      ORDER BY screening_at DESC
      LIMIT 1
    ) AS screening_id
)
SELECT r.id, r.seat_key, r.attended, r.is_ghost
FROM reservations r
CROSS JOIN target t
WHERE r.user_id = t.user_id
  AND r.screening_id = t.screening_id;

-- ========== 4. Execute (run entire DO block as one query) ==========

DO $$
DECLARE
  target_user_id uuid;
  target_screening_id uuid;
  prior_attended boolean[];
  prior_all_false boolean;
  rows_updated integer;
  current_no_show integer;
  next_no_show integer;
BEGIN
  SELECT id INTO target_user_id
  FROM profiles
  WHERE display_name ILIKE 'Lucy'
  ORDER BY display_name
  LIMIT 1;

  SELECT id INTO target_screening_id
  FROM screenings
  WHERE title = '对她说 Hable con ella'
  ORDER BY screening_at DESC
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for display_name ILIKE Lucy';
  END IF;

  IF target_screening_id IS NULL THEN
    RAISE EXCEPTION 'Screening not found for title = 对她说 Hable con ella. Fix title from step 2.';
  END IF;

  SELECT array_agg(r.attended ORDER BY r.seat_key)
  INTO prior_attended
  FROM reservations r
  WHERE r.screening_id = target_screening_id
    AND r.user_id = target_user_id
    AND COALESCE(r.is_ghost, false) = false;

  IF prior_attended IS NULL OR array_length(prior_attended, 1) IS NULL THEN
    RAISE EXCEPTION 'No non-ghost reservation for this user on this screening. Add a seat first or check names/IDs.';
  END IF;

  prior_all_false := NOT EXISTS (
    SELECT 1 FROM unnest(prior_attended) AS a(v) WHERE a.v IS DISTINCT FROM false
  );

  UPDATE reservations
  SET attended = false
  WHERE screening_id = target_screening_id
    AND user_id = target_user_id
    AND COALESCE(is_ghost, false) = false
    AND attended IS DISTINCT FROM false;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  IF rows_updated = 0 AND prior_all_false THEN
    RAISE NOTICE 'Reservations already marked no-show; profile counters unchanged (idempotent).';
    RETURN;
  END IF;

  IF NOT prior_all_false THEN
    SELECT COALESCE(no_show_count, 0) INTO current_no_show
    FROM profiles
    WHERE id = target_user_id;

    next_no_show := LEAST(LEAST(COALESCE(current_no_show, 0), 3) + 1, 3);

    UPDATE profiles
    SET
      consecutive_attendances = 0,
      no_show_count = next_no_show
    WHERE id = target_user_id;
  END IF;
END $$;

-- ========== 5. Verify ==========
WITH target AS (
  SELECT
    (SELECT id FROM profiles WHERE display_name ILIKE 'Lucy' ORDER BY display_name LIMIT 1) AS user_id,
    (
      SELECT id
      FROM screenings
      WHERE title = '对她说 Hable con ella'
      ORDER BY screening_at DESC
      LIMIT 1
    ) AS screening_id
)
SELECT p.display_name, s.title, r.seat_key, r.attended, p.no_show_count, p.consecutive_attendances
FROM reservations r
JOIN profiles p ON p.id = r.user_id
JOIN screenings s ON s.id = r.screening_id
CROSS JOIN target t
WHERE r.user_id = t.user_id
  AND r.screening_id = t.screening_id
  AND COALESCE(r.is_ghost, false) = false;
