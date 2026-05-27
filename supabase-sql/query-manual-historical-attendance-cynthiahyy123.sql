-- Manual historical attendance fix: cynthiahyy123
-- Attended: 观影室, 为吾子寄信吾母, 他他她他他, 下妻物语, 三粒粗盐, 天涯沦落女,
--           你妈妈也一样, 修罗雪姬, 日常, 事情原来是这样的……
-- Did NOT attend: 怠惰女子的肖像, 82年生的金智英
--
-- Run in Supabase SQL Editor. Review SELECT steps before uncommenting the transaction.

-- ========== 1. Resolve user ==========
SELECT id AS user_id, display_name, contact_id, wechat_id
FROM profiles
WHERE display_name ILIKE 'cynthiahyy123'
   OR contact_id ILIKE 'cynthiahyy123'
   OR wechat_id ILIKE 'cynthiahyy123'
ORDER BY display_name;

-- ========== 2. Resolve screenings (10 attended + 2 to remove) ==========
SELECT id, title, title_en, screening_at
FROM screenings
WHERE title IN (
  '观影室',
  '为吾子寄信吾母',
  '他他她他他',
  '下妻物语',
  '三粒粗盐',
  '天涯沦落女',
  '你妈妈也一样',
  '修罗雪姬',
  '日常',
  '事情原来是这样的……',
  '怠惰女子的肖像',
  '82年生的金智英'
)
ORDER BY screening_at DESC;

-- ========== 3. Current retroactive claims for this user ==========
/*
SELECT s.title, s.screening_at, r.seat_key, r.attended, r.created_at
FROM reservations r
JOIN profiles p ON p.id = r.user_id
JOIN screenings s ON s.id = r.screening_id
WHERE (p.display_name ILIKE 'cynthiahyy123' OR p.contact_id ILIKE 'cynthiahyy123')
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
  WHERE display_name ILIKE 'cynthiahyy123'
     OR contact_id ILIKE 'cynthiahyy123'
  LIMIT 1
),
attended_titles AS (
  SELECT unnest(ARRAY[
    '观影室',
    '为吾子寄信吾母',
    '他他她他他',
    '下妻物语',
    '三粒粗盐',
    '天涯沦落女',
    '你妈妈也一样',
    '修罗雪姬',
    '日常',
    '事情原来是这样的……'
  ]::text[]) AS title
),
remove_titles AS (
  SELECT unnest(ARRAY[
    '怠惰女子的肖像',
    '82年生的金智英'
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
WHERE p.display_name ILIKE 'cynthiahyy123'
  AND COALESCE(r.is_ghost, false) = false
  AND r.seat_key LIKE 'catalog-%'
ORDER BY s.screening_at DESC;
*/
