-- Bulk retroactive attendance: add one user to many past screenings (catalog seat_key).
-- Run in Supabase SQL Editor. Review SELECT steps before uncommenting the transaction.
--
-- Edit YOUR_USER_DISPLAY_NAME, attended_titles, and remove_titles below.

-- ========== 1. Resolve user ==========
SELECT id AS user_id, display_name, contact_id, wechat_id
FROM profiles
WHERE display_name ILIKE 'YOUR_USER_DISPLAY_NAME'
   OR contact_id ILIKE 'YOUR_USER_DISPLAY_NAME'
ORDER BY display_name;

-- ========== 2. Resolve screenings ==========
SELECT id, title, title_en, screening_at
FROM screenings
WHERE title IN (
  'YOUR_SCREENING_TITLE_1',
  'YOUR_SCREENING_TITLE_2'
  -- add more titles to check
)
ORDER BY screening_at DESC;

-- ========== 3. Current catalog claims for this user ==========
/*
SELECT s.title, s.screening_at, r.seat_key, r.attended, r.created_at
FROM reservations r
JOIN profiles p ON p.id = r.user_id
JOIN screenings s ON s.id = r.screening_id
WHERE p.display_name ILIKE 'YOUR_USER_DISPLAY_NAME'
  AND COALESCE(r.is_ghost, false) = false
  AND r.seat_key LIKE 'catalog-%'
ORDER BY s.screening_at DESC;
*/

-- ========== 4. Execute (uncomment when steps 1–2 look correct) ==========
/*
BEGIN;

WITH u AS (
  SELECT id AS user_id
  FROM profiles
  WHERE display_name ILIKE 'YOUR_USER_DISPLAY_NAME'
  LIMIT 1
),
attended_titles AS (
  SELECT unnest(ARRAY[
    'YOUR_SCREENING_TITLE_1',
    'YOUR_SCREENING_TITLE_2'
  ]::text[]) AS title
),
remove_titles AS (
  SELECT unnest(ARRAY[
    'SCREENING_TO_REMOVE_1'
  ]::text[]) AS title
),
to_add AS (
  SELECT s.id AS screening_id, u.user_id
  FROM u
  CROSS JOIN attended_titles t
  JOIN screenings s ON s.title = t.title
  WHERE u.user_id IS NOT NULL
),
deleted AS (
  DELETE FROM reservations r
  USING u, remove_titles t, screenings s
  WHERE r.user_id = u.user_id
    AND r.screening_id = s.id
    AND s.title = t.title
    AND COALESCE(r.is_ghost, false) = false
    AND r.seat_key LIKE 'catalog-%'
  RETURNING r.id, s.title
)
INSERT INTO reservations (screening_id, user_id, seat_key, is_squeezed, is_ghost, attended)
SELECT
  a.screening_id,
  a.user_id,
  'catalog-' || left(replace(a.user_id::text, '-', ''), 12),
  false,
  false,
  NULL
FROM to_add a
WHERE NOT EXISTS (
  SELECT 1
  FROM reservations r
  WHERE r.screening_id = a.screening_id
    AND r.user_id = a.user_id
    AND COALESCE(r.is_ghost, false) = false
);

COMMIT;
*/

-- ========== 5. Verify ==========
/*
SELECT s.title, s.screening_at, r.seat_key, r.attended
FROM reservations r
JOIN profiles p ON p.id = r.user_id
JOIN screenings s ON s.id = r.screening_id
WHERE p.display_name ILIKE 'YOUR_USER_DISPLAY_NAME'
  AND COALESCE(r.is_ghost, false) = false
  AND r.seat_key LIKE 'catalog-%'
ORDER BY s.screening_at DESC;
*/
