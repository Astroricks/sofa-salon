-- Merge duplicate guest accounts by user_id: move FROM user's history onto TO user, delete FROM auth user.
-- Run in Supabase SQL Editor. Edit from_id / to_id below for other merges.
--
-- This run: znn → zmm
--   FROM  1e7cc1b3-3e4d-4368-ba08-bc7e78a274cc
--   TO    176fe7d2-b09c-4829-9370-07d4b43aba1c

-- ========== IDs (edit for another merge) ==========
-- Use in all steps via merge_ids CTE, and in step 4 DO block.

-- ========== 0. Both profiles + target badge count ==========
WITH merge_ids AS (
  SELECT
    '1e7cc1b3-3e4d-4368-ba08-bc7e78a274cc'::uuid AS from_id,
    '176fe7d2-b09c-4829-9370-07d4b43aba1c'::uuid AS to_id
)
SELECT p.id, p.display_name, p.contact_platform, p.contact_id,
       p.no_show_count, p.consecutive_attendances,
       public.get_user_attendance_count(p.id) AS badge_attendance_count,
       CASE p.id WHEN m.from_id THEN 'FROM (delete after merge)' WHEN m.to_id THEN 'TO (keep)' END AS role
FROM profiles p
CROSS JOIN merge_ids m
WHERE p.id IN (m.from_id, m.to_id)
ORDER BY role;

-- Orphan reservations (user_id with no profile — should be empty unless FK bypassed).
WITH merge_ids AS (
  SELECT
    '1e7cc1b3-3e4d-4368-ba08-bc7e78a274cc'::uuid AS from_id,
    '176fe7d2-b09c-4829-9370-07d4b43aba1c'::uuid AS to_id
)
SELECT r.id, r.user_id, r.screening_id, r.seat_key, r.attended
FROM reservations r
CROSS JOIN merge_ids m
WHERE r.user_id = m.from_id
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = m.from_id);

-- ========== 1. Reservations still on FROM user (including if profile row is gone) ==========
WITH merge_ids AS (
  SELECT
    '1e7cc1b3-3e4d-4368-ba08-bc7e78a274cc'::uuid AS from_id,
    '176fe7d2-b09c-4829-9370-07d4b43aba1c'::uuid AS to_id
)
SELECT r.screening_id, s.title, s.screening_at, r.seat_key, r.attended, r.is_ghost
FROM reservations r
JOIN screenings s ON s.id = r.screening_id
CROSS JOIN merge_ids m
WHERE r.user_id = m.from_id
ORDER BY s.screening_at;

-- ========== 2. Badge counts before merge ==========
WITH merge_ids AS (
  SELECT
    '1e7cc1b3-3e4d-4368-ba08-bc7e78a274cc'::uuid AS from_id,
    '176fe7d2-b09c-4829-9370-07d4b43aba1c'::uuid AS to_id
)
SELECT public.get_user_attendance_count(m.from_id) AS from_badge_count,
       public.get_user_attendance_count(m.to_id) AS to_badge_count
FROM merge_ids m;

-- ========== 3. Conflicts (FROM rows dropped if TO already has same seat / waitlist / rating) ==========
WITH merge_ids AS (
  SELECT
    '1e7cc1b3-3e4d-4368-ba08-bc7e78a274cc'::uuid AS from_id,
    '176fe7d2-b09c-4829-9370-07d4b43aba1c'::uuid AS to_id
)
SELECT 'duplicate seat' AS conflict, r.id, r.screening_id, r.seat_key
FROM reservations r
CROSS JOIN merge_ids m
WHERE r.user_id = m.from_id
  AND EXISTS (
    SELECT 1 FROM reservations r2
    WHERE r2.user_id = m.to_id
      AND r2.screening_id = r.screening_id
      AND r2.seat_key = r.seat_key
  );

WITH merge_ids AS (
  SELECT
    '1e7cc1b3-3e4d-4368-ba08-bc7e78a274cc'::uuid AS from_id,
    '176fe7d2-b09c-4829-9370-07d4b43aba1c'::uuid AS to_id
)
SELECT 'duplicate waitlist' AS conflict, w.screening_id
FROM waitlist w
CROSS JOIN merge_ids m
WHERE w.user_id = m.from_id
  AND EXISTS (
    SELECT 1 FROM waitlist w2
    WHERE w2.user_id = m.to_id AND w2.screening_id = w.screening_id
  );

WITH merge_ids AS (
  SELECT
    '1e7cc1b3-3e4d-4368-ba08-bc7e78a274cc'::uuid AS from_id,
    '176fe7d2-b09c-4829-9370-07d4b43aba1c'::uuid AS to_id
)
SELECT 'duplicate rating' AS conflict, sr.screening_id
FROM screening_ratings sr
CROSS JOIN merge_ids m
WHERE sr.user_id = m.from_id
  AND EXISTS (
    SELECT 1 FROM screening_ratings sr2
    WHERE sr2.user_id = m.to_id AND sr2.screening_id = sr.screening_id
  );

-- ========== 4. Execute merge (run entire DO block as one query) ==========

DO $$
DECLARE
  from_id uuid := '1e7cc1b3-3e4d-4368-ba08-bc7e78a274cc';
  to_id uuid := '176fe7d2-b09c-4829-9370-07d4b43aba1c';
  src_no_show integer;
  src_consecutive integer;
  to_exists boolean;
  from_profile_exists boolean;
BEGIN
  IF from_id = to_id THEN
    RAISE EXCEPTION 'from_id and to_id must differ.';
  END IF;

  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = to_id) INTO to_exists;
  IF NOT to_exists THEN
    RAISE EXCEPTION 'TO profile % not found.', to_id;
  END IF;

  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = from_id) INTO from_profile_exists;

  DELETE FROM reservations r
  WHERE r.user_id = from_id
    AND EXISTS (
      SELECT 1 FROM reservations r2
      WHERE r2.user_id = to_id
        AND r2.screening_id = r.screening_id
        AND r2.seat_key = r.seat_key
    );

  DELETE FROM waitlist w
  WHERE w.user_id = from_id
    AND EXISTS (
      SELECT 1 FROM waitlist w2
      WHERE w2.user_id = to_id AND w2.screening_id = w.screening_id
    );

  DELETE FROM screening_ratings sr
  WHERE sr.user_id = from_id
    AND EXISTS (
      SELECT 1 FROM screening_ratings sr2
      WHERE sr2.user_id = to_id AND sr2.screening_id = sr.screening_id
    );

  DELETE FROM reschedule_votes rv
  WHERE rv.user_id = from_id
    AND EXISTS (
      SELECT 1 FROM reschedule_votes rv2
      WHERE rv2.user_id = to_id AND rv2.option_id = rv.option_id
    );

  UPDATE reservations SET user_id = to_id WHERE user_id = from_id;
  UPDATE waitlist SET user_id = to_id WHERE user_id = from_id;
  UPDATE screening_ratings SET user_id = to_id WHERE user_id = from_id;
  UPDATE ticker_user_messages SET user_id = to_id WHERE user_id = from_id;
  UPDATE support_logs SET user_id = to_id WHERE user_id = from_id;
  UPDATE reschedule_votes SET user_id = to_id WHERE user_id = from_id;
  UPDATE reschedule_proposals SET created_by = to_id WHERE created_by = from_id;
  UPDATE ticker_custom SET created_by = to_id WHERE created_by = from_id;

  UPDATE reservations r
  SET attended = CASE
    WHEN ps.any_false THEN false
    ELSE NULL
  END
  FROM (
    SELECT screening_id,
           bool_or(attended IS FALSE) AS any_false
    FROM reservations
    WHERE user_id = to_id AND COALESCE(is_ghost, false) = false
    GROUP BY screening_id
  ) ps
  WHERE r.user_id = to_id
    AND r.screening_id = ps.screening_id
    AND COALESCE(r.is_ghost, false) = false
    AND (
      (ps.any_false AND r.attended IS DISTINCT FROM false)
      OR (NOT ps.any_false AND r.attended IS NOT NULL)
    );

  IF from_profile_exists THEN
    SELECT no_show_count, consecutive_attendances
    INTO src_no_show, src_consecutive
    FROM profiles
    WHERE id = from_id;

    UPDATE profiles p
    SET
      no_show_count = LEAST(3, GREATEST(COALESCE(p.no_show_count, 0), COALESCE(src_no_show, 0))),
      consecutive_attendances = GREATEST(
        COALESCE(p.consecutive_attendances, 0),
        COALESCE(src_consecutive, 0)
      )
    WHERE p.id = to_id;

    DELETE FROM auth.users WHERE id = from_id;
  END IF;
END $$;

-- ========== 5. Verify TO user ==========
WITH merge_ids AS (
  SELECT '176fe7d2-b09c-4829-9370-07d4b43aba1c'::uuid AS to_id
)
SELECT p.id, p.display_name, p.no_show_count, p.consecutive_attendances,
       public.get_user_attendance_count(p.id) AS badge_attendance_count
FROM profiles p
CROSS JOIN merge_ids m
WHERE p.id = m.to_id;

WITH merge_ids AS (
  SELECT '176fe7d2-b09c-4829-9370-07d4b43aba1c'::uuid AS to_id
)
SELECT s.title, s.screening_at, r.seat_key, r.attended
FROM reservations r
JOIN screenings s ON s.id = r.screening_id
CROSS JOIN merge_ids m
WHERE r.user_id = m.to_id
  AND COALESCE(r.is_ghost, false) = false
  AND s.screening_at < now()
ORDER BY s.screening_at;

-- FROM auth user should be gone (0 rows) if profile existed before step 4.
SELECT id, email FROM auth.users WHERE id = '1e7cc1b3-3e4d-4368-ba08-bc7e78a274cc';
