-- Manual history: add an existing user to a past screening (present = attended null).
-- Mirrors admin "add guest" without sending email.
-- Run in Supabase SQL Editor. Run SELECT steps first; uncomment the transaction only when IDs look right.
--
-- Badge / audit queries count past non-ghost reservations where attended IS DISTINCT FROM false
-- (present = null). Profile side effects (consecutive_attendances / pigeon recovery) are NOT applied
-- here — use admin Guests UI or adjust profiles separately if needed.

-- ========== 1. Resolve user (edit display_name if needed) ==========
SELECT id AS user_id, display_name, contact_platform, contact_id, no_show_count, consecutive_attendances
FROM profiles
WHERE display_name ILIKE 'Sister TangYi'
ORDER BY display_name;

-- ========== 2. Resolve screening (edit title if needed; pick the correct row if several match) ==========
-- Primary name is screenings.title (often Chinese). English may be screenings.title_en only.
SELECT id AS screening_id, title, title_en, screening_at, is_active
FROM screenings
WHERE title ILIKE '%盗日者%'
   OR title_en ILIKE '%Man Who Stole the Sun%'
ORDER BY screening_at DESC;

-- ========== 3. Preflight: already reserved on this screening? ==========
-- Replace UUIDs from steps 1–2 (or use the subqueries in step 4).
/*
SELECT r.id, r.seat_key, r.attended, r.is_ghost, r.created_at
FROM reservations r
WHERE r.screening_id = 'SCREENING_UUID'::uuid
  AND r.user_id = 'USER_UUID'::uuid
  AND COALESCE(r.is_ghost, false) = false;
*/

-- ========== 4. Taken seats (pick any seat_key not listed; same format as the seat map, e.g. sofa-1:0) ==========
/*
SELECT seat_key
FROM reservations
WHERE screening_id = 'SCREENING_UUID'::uuid
ORDER BY seat_key;
*/

-- ========== 5. Execute: insert reservation (if missing) — present = null ==========
-- Sister TangYi · 盗日者 — fill seat_key after step 4.
-- If step 3 already shows a row, skip INSERT.

BEGIN;

WITH target AS (
  SELECT
    (SELECT id FROM profiles WHERE display_name = 'Sister TangYi' LIMIT 1) AS user_id,
    (
      SELECT id
      FROM screenings
      WHERE title = '盗日者'
      ORDER BY screening_at DESC
      LIMIT 1
    ) AS screening_id
)
INSERT INTO reservations (screening_id, user_id, seat_key, is_squeezed, is_ghost, attended)
SELECT
  t.screening_id,
  t.user_id,
  'sofa-0:0',  -- CHANGE: must be free on this screening (see step 4)
  false,
  false,
  NULL
FROM target t
WHERE t.user_id IS NOT NULL
  AND t.screening_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM reservations r
    WHERE r.screening_id = t.screening_id
      AND r.user_id = t.user_id
      AND COALESCE(r.is_ghost, false) = false
  );

COMMIT;

-- ========== 6. Verify ==========
SELECT
  p.display_name,
  s.title,
  s.screening_at,
  r.seat_key,
  r.attended,
  r.is_ghost
FROM reservations r
JOIN profiles p ON p.id = r.user_id
JOIN screenings s ON s.id = r.screening_id
WHERE p.display_name = 'Sister TangYi'
  AND s.title = '盗日者'
  AND COALESCE(r.is_ghost, false) = false;
