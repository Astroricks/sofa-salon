-- Delete test guest accounts by exact display name (case-insensitive).
-- Edit target_names in each step before running.
--
-- Run in Supabase SQL Editor.
-- 1) Run steps 1–2 (SELECT) and confirm rows look correct.
-- 2) Uncomment and run step 3 (DO block) as one query.
-- Deleting auth.users cascades: profiles, reservations, waitlist, ratings, etc.

-- ========== 1. Profiles to delete ==========
WITH target_names(name) AS (
  SELECT unnest(ARRAY[
    'YOUR_TEST_DISPLAY_NAME_1',
    'YOUR_TEST_DISPLAY_NAME_2'
  ]::text[])
)
SELECT
  p.id AS user_id,
  p.display_name,
  p.contact_platform,
  p.contact_id,
  p.wechat_id,
  p.is_admin,
  p.created_at,
  (SELECT COUNT(*) FROM reservations r WHERE r.user_id = p.id) AS reservations,
  (SELECT COUNT(*) FROM waitlist w WHERE w.user_id = p.id) AS waitlist_rows,
  (SELECT COUNT(*) FROM screening_ratings sr WHERE sr.user_id = p.id) AS ratings
FROM profiles p
WHERE lower(btrim(p.display_name)) IN (SELECT lower(btrim(name)) FROM target_names)
ORDER BY p.display_name, p.created_at;

-- ========== 2. Related rows (detail) ==========
WITH target_names(name) AS (
  SELECT unnest(ARRAY[
    'YOUR_TEST_DISPLAY_NAME_1',
    'YOUR_TEST_DISPLAY_NAME_2'
  ]::text[])
),
targets AS (
  SELECT id
  FROM profiles
  WHERE lower(btrim(display_name)) IN (SELECT lower(btrim(name)) FROM target_names)
)
SELECT 'reservations' AS kind, COUNT(*)::bigint AS n FROM reservations r JOIN targets t ON t.id = r.user_id
UNION ALL
SELECT 'waitlist', COUNT(*) FROM waitlist w JOIN targets t ON t.id = w.user_id
UNION ALL
SELECT 'screening_ratings', COUNT(*) FROM screening_ratings sr JOIN targets t ON t.id = sr.user_id
UNION ALL
SELECT 'ticker_user_messages', COUNT(*) FROM ticker_user_messages m JOIN targets t ON t.id = m.user_id
UNION ALL
SELECT 'support_logs', COUNT(*) FROM support_logs sl JOIN targets t ON t.id = sl.user_id
UNION ALL
SELECT 'reschedule_votes', COUNT(*) FROM reschedule_votes rv JOIN targets t ON t.id = rv.user_id
UNION ALL
SELECT 'reschedule_proposals', COUNT(*) FROM reschedule_proposals rp JOIN targets t ON t.id = rp.created_by;

-- ========== 3. Execute delete (uncomment when steps 1–2 look correct) ==========
/*
DO $$
DECLARE
  target_ids uuid[];
  admin_hit text;
BEGIN
  SELECT array_agg(p.id ORDER BY p.display_name)
  INTO target_ids
  FROM profiles p
  WHERE lower(btrim(p.display_name)) IN (
    SELECT lower(btrim(name))
    FROM unnest(ARRAY[
      'YOUR_TEST_DISPLAY_NAME_1',
      'YOUR_TEST_DISPLAY_NAME_2'
    ]::text[]) AS name
  );

  IF target_ids IS NULL OR array_length(target_ids, 1) IS NULL THEN
    RAISE NOTICE 'No matching profiles — nothing to delete.';
    RETURN;
  END IF;

  SELECT string_agg(p.display_name, ', ')
  INTO admin_hit
  FROM profiles p
  WHERE p.id = ANY(target_ids)
    AND COALESCE(p.is_admin, false) = true;

  IF admin_hit IS NOT NULL THEN
    RAISE EXCEPTION 'Refusing to delete admin account(s): %', admin_hit;
  END IF;

  UPDATE rooms SET owner_id = NULL WHERE owner_id = ANY(target_ids);
  UPDATE screenings SET created_by = NULL WHERE created_by = ANY(target_ids);
  UPDATE ticker_custom SET created_by = NULL WHERE created_by = ANY(target_ids);

  DELETE FROM auth.users WHERE id = ANY(target_ids);

  RAISE NOTICE 'Deleted % auth user(s).', array_length(target_ids, 1);
END $$;
*/

-- ========== 4. Verify (after step 3) ==========
/*
WITH target_names(name) AS (
  SELECT unnest(ARRAY[
    'YOUR_TEST_DISPLAY_NAME_1',
    'YOUR_TEST_DISPLAY_NAME_2'
  ]::text[])
)
SELECT id, display_name
FROM profiles
WHERE lower(btrim(display_name)) IN (SELECT lower(btrim(name)) FROM target_names);
*/
