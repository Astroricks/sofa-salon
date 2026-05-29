-- Add 鬼怪屋 (House, 1977) encore screening on 2024-11-01 (separate from 2024-09-27).
-- Enables profile 补登 + admin Guests on /admin/screenings/{id}.
--
-- Run in Supabase SQL Editor. Review step 1, then run step 2.

-- ========== 1. Preview ==========
SELECT id, title, title_en, screening_at, is_active, duration_minutes
FROM screenings
WHERE title = '鬼怪屋'
ORDER BY screening_at;

-- ========== 2. Insert encore (idempotent) ==========
INSERT INTO screenings (
  id,
  title,
  title_en,
  director,
  director_en,
  year,
  screening_at,
  is_active,
  duration_minutes,
  douban_url,
  letterboxd_url,
  trailer_url,
  description
)
SELECT
  '51109206-5ad1-44d5-8fbf-52dd09bf5abb'::uuid,
  src.title,
  src.title_en,
  src.director,
  src.director_en,
  src.year,
  ('2024-11-01 19:30'::timestamp AT TIME ZONE 'America/New_York'),
  false,
  COALESCE(src.duration_minutes, 88),
  src.douban_url,
  COALESCE(NULLIF(BTRIM(src.letterboxd_url), ''), 'https://boxd.it/7J9Th1'),
  src.trailer_url,
  src.description
FROM screenings src
WHERE src.id = '0a0358e9-5b17-4eaa-82cd-9c763e9cc8f1'::uuid
  AND NOT EXISTS (
    SELECT 1
    FROM screenings x
    WHERE x.id = '51109206-5ad1-44d5-8fbf-52dd09bf5abb'::uuid
       OR (
         (x.screening_at AT TIME ZONE 'America/New_York')::date = DATE '2024-11-01'
         AND regexp_replace(BTRIM(x.title), '[（(]\d{4}[）)]\s*$', '', 'g') = '鬼怪屋'
       )
  );

-- ========== 3. Verify ==========
SELECT id, title, title_en, director, year, screening_at, is_active, duration_minutes, letterboxd_url
FROM screenings
WHERE title = '鬼怪屋'
ORDER BY screening_at;
