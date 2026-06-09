/**
 * Reads scripts/data/ziggygraph-screenings-zh.csv + scripts/data/letterboxd-diary.csv
 * (bring your own Letterboxd export; see scripts/data/README.md) and writes
 * supabase-sql/37-seed-historical-screenings-catalog.sql
 *
 * Run: node scripts/generate-historical-screenings-sql.mjs
 */
import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { buildTitleEnMap, titleEnForRow } from './lib/match-letterboxd-en.mjs';
import {
  parseCsvLine,
  parseSheetDate,
  extractFilmYear,
  stripTitleYearSuffix,
} from './lib/parse-screening-csv.mjs';
import { matchExistingScreeningSql } from './lib/sheet-screening-match-sql.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, 'data/ziggygraph-screenings-zh.csv');
const DIARY_PATH = join(__dirname, 'data/letterboxd-diary.csv');
const MAP_PATH = join(__dirname, 'data/historical-title-en-map.json');
const UNMATCHED_PATH = join(__dirname, 'data/historical-title-en-unmatched.json');
const OUT_PATH = join(__dirname, '../supabase-sql/37-seed-historical-screenings-catalog.sql');
const DEDUPE_PATH = join(__dirname, '../supabase-sql/40-remove-sheet-seed-duplicates.sql');

if (!existsSync(DIARY_PATH)) {
  console.error(
    'Missing scripts/data/letterboxd-diary.csv — export your Letterboxd diary and save it there (see scripts/data/README.md).'
  );
  process.exit(1);
}

/** Deterministic UUID from sheet date + title (idempotent re-runs). */
function stableScreeningId(dateStr, title) {
  const hex = createHash('sha256').update(`ziggygraph-catalog|${dateStr}|${title}`).digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    '4' + hex.slice(13, 16),
    ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hex.slice(18, 20),
    hex.slice(20, 32),
  ].join('-');
}

function parseSheetDateParts(dateStr) {
  const parts = dateStr.trim().split('.');
  if (parts.length !== 3) throw new Error(`Bad date: ${dateStr}`);
  return { year: Number(parts[0]), month: Number(parts[1]), day: Number(parts[2]) };
}

/** 7:30 PM America/New_York on screening day (DST-safe in Postgres). */
function screeningAtSql(dateStr) {
  const { year, month, day } = parseSheetDateParts(dateStr);
  const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return `('${ymd} 19:30'::timestamp AT TIME ZONE 'America/New_York')`;
}

function isMostlyLatin(s) {
  if (!s?.trim()) return false;
  const latin = (s.match(/[A-Za-z0-9]/g) || []).length;
  const cjk = (s.match(/[\u4e00-\u9fff]/g) || []).length;
  return latin > 0 && cjk === 0;
}

function sqlEscape(s) {
  return (s ?? '').replace(/'/g, "''");
}

const titleEnMap = buildTitleEnMap(CSV_PATH, DIARY_PATH);

const mapEntries = [];
for (const [key, titleEn] of titleEnMap) {
  const pipe = key.indexOf('|');
  mapEntries.push({
    date: key.slice(0, pipe),
    title: key.slice(pipe + 1),
    titleEn,
  });
}
mapEntries.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
writeFileSync(MAP_PATH, JSON.stringify(mapEntries, null, 2));

const raw = readFileSync(CSV_PATH, 'utf8').trim();
const lines = raw.split(/\r?\n/).filter(Boolean);
const rows = [];
let withEn = 0;
const unmatched = [];

for (const line of lines) {
  const [date, title, , director] = parseCsvLine(line);
  if (!date?.match(/^\d{4}\.\d{1,2}\.\d{1,2}$/)) continue;
  const titleCsv = title.trim();
  const titleZh = stripTitleYearSuffix(titleCsv);
  const isoDate = parseSheetDate(date);
  let titleEn = titleEnForRow(titleEnMap, isoDate, titleCsv);
  if (!titleEn && isMostlyLatin(titleZh)) titleEn = titleZh;
  if (titleEn) withEn++;
  else unmatched.push({ date: isoDate, title: titleZh });

  const directorEn = isMostlyLatin(director) ? director.trim() : '';
  rows.push({
    date,
    title: titleZh,
    titleEn,
    director: (director ?? '').trim(),
    directorEn,
    year: extractFilmYear(titleCsv),
    id: stableScreeningId(date, titleCsv),
    screeningAtSql: screeningAtSql(date),
  });
}

rows.sort((a, b) => b.date.localeCompare(a.date));

const vCols = {
  title: 'v.title',
  year: 'v.year',
  screeningAt: 'v.screening_at',
};
const matchExisting = matchExistingScreeningSql('s', vCols);

const values = rows
  .map((r) => {
    return `(
  '${r.id}'::uuid,
  '${sqlEscape(r.title)}',
  '${sqlEscape(r.titleEn)}',
  '${sqlEscape(r.director)}',
  '${sqlEscape(r.directorEn)}',
  ${r.year ?? 'NULL'},
  ${r.screeningAtSql},
  false
)`;
  })
  .join(',\n');

const patchValues = rows
  .map((r) => {
    const { year, month, day } = parseSheetDateParts(r.date);
    const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return `('${ymd}'::date, ${r.year ?? 'NULL'}, '${sqlEscape(r.title)}', '${sqlEscape(r.titleEn)}', ${r.screeningAtSql})`;
  })
  .join(',\n  ');

const patchMatch = matchExistingScreeningSql('s', {
  title: 'patch.sheet_title',
  year: 'patch.release_year',
  screeningAt: 'patch.screening_at',
});

const sql = `-- =============================================================================
-- 37 — Sheet seed + safe title sync (run once after 36)
-- =============================================================================
-- (A) INSERT sheet rows only when no matching screening already exists on that NY date
--     (same Chinese title, or same year + site director set, or bilingual title in one field).
--     Does NOT insert a second row when only the sheet director differs.
--
-- (B) Patch empty title / title_en on the matching existing row only.
--
-- (C) Split site rows that stored "中文 Foreign title" in title alone → title + title_en.
--
-- Re-run safe. Regenerate: node scripts/generate-historical-screenings-sql.mjs
-- If you already ran an older 37 and see duplicates, run 40-remove-sheet-seed-duplicates.sql first.
-- =============================================================================

-- (A) Sheet seed (skip when site already has this screening)
INSERT INTO screenings (
  id,
  title,
  title_en,
  director,
  director_en,
  year,
  screening_at,
  is_active
)
SELECT
  v.id,
  v.title,
  v.title_en,
  v.director,
  v.director_en,
  v.year,
  v.screening_at,
  v.is_active
FROM (
  VALUES
${values}
) AS v(id, title, title_en, director, director_en, year, screening_at, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM screenings s
  WHERE ${matchExisting}
)
ON CONFLICT (id) DO UPDATE SET
  title = CASE
    WHEN NULLIF(BTRIM(screenings.title), '') IS NOT NULL
      AND NULLIF(BTRIM(screenings.title_en), '') IS NOT NULL
    THEN screenings.title
    ELSE COALESCE(NULLIF(BTRIM(EXCLUDED.title), ''), screenings.title)
  END,
  title_en = CASE
    WHEN NULLIF(BTRIM(screenings.title), '') IS NOT NULL
      AND NULLIF(BTRIM(screenings.title_en), '') IS NOT NULL
    THEN screenings.title_en
    ELSE COALESCE(NULLIF(BTRIM(EXCLUDED.title_en), ''), screenings.title_en)
  END,
  director = CASE
    WHEN NULLIF(BTRIM(screenings.director), '') IS NOT NULL THEN screenings.director
    ELSE EXCLUDED.director
  END,
  director_en = CASE
    WHEN NULLIF(BTRIM(screenings.director_en), '') IS NOT NULL THEN screenings.director_en
    ELSE EXCLUDED.director_en
  END,
  year = EXCLUDED.year,
  screening_at = EXCLUDED.screening_at,
  is_active = false;

-- (B) Matching site rows: fill empty title / title_en only
UPDATE screenings AS s
SET
  title = CASE
    WHEN NULLIF(BTRIM(s.title), '') IS NULL THEN patch.sheet_title
    ELSE s.title
  END,
  title_en = CASE
    WHEN NULLIF(BTRIM(s.title_en), '') IS NULL THEN NULLIF(BTRIM(patch.sheet_title_en), '')
    ELSE s.title_en
  END
FROM (
  VALUES
  ${patchValues}
) AS patch(screening_date, release_year, sheet_title, sheet_title_en, screening_at)
WHERE ${patchMatch}
  AND (
    NULLIF(BTRIM(s.title), '') IS NULL
    OR NULLIF(BTRIM(s.title_en), '') IS NULL
  )
  AND NOT (
    NULLIF(BTRIM(s.title), '') IS NOT NULL
    AND NULLIF(BTRIM(s.title_en), '') IS NOT NULL
  );

-- (C) Bilingual combined title → Chinese in title, Latin suffix in title_en
UPDATE screenings AS s
SET
  title = split.zh,
  title_en = split.latin
FROM (
  SELECT
    id,
    (regexp_match(
      BTRIM(title),
      '^([\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\s，、。！？；：""''（）【】《》—…·]+?)\\s+(.+)$'
    ))[1] AS zh,
    (regexp_match(
      BTRIM(title),
      '^([\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\s，、。！？；：""''（）【】《》—…·]+?)\\s+(.+)$'
    ))[2] AS latin
  FROM screenings
  WHERE title ~ '[\u4e00-\u9fff]'
    AND title ~ '[A-Za-z]'
) AS split
WHERE s.id = split.id
  AND split.zh IS NOT NULL
  AND split.latin IS NOT NULL;
`;

const dedupeMatch = matchExistingScreeningSql('site', {
  title: 'seed.title',
  year: 'seed.year',
  screeningAt: 'seed.screening_at',
});

const dedupeSql = `-- Remove duplicate sheet-seed rows after an older 37 run (site row + seed row same film).
-- Keeps the row that was already on the site; deletes is_active = false seed duplicate.
-- Skips seed rows that still have reservations (merge or move those first).
-- Regenerate: node scripts/generate-historical-screenings-sql.mjs

DELETE FROM screenings AS seed
WHERE seed.is_active = false
  AND EXISTS (
    SELECT 1 FROM screenings AS site
    WHERE site.id <> seed.id
      AND ${dedupeMatch}
  )
  AND NOT EXISTS (
    SELECT 1 FROM reservations r WHERE r.screening_id = seed.id
  );
`;

writeFileSync(OUT_PATH, sql);
writeFileSync(DEDUPE_PATH, dedupeSql);

console.log(`Wrote ${rows.length} screenings to ${OUT_PATH}`);
console.log(`Wrote ${DEDUPE_PATH}`);
console.log(`title_en filled: ${withEn} / ${rows.length}`);
writeFileSync(UNMATCHED_PATH, JSON.stringify(unmatched, null, 2));
if (unmatched.length) {
  console.log(`Unmatched (${unmatched.length}) → ${UNMATCHED_PATH}`);
  for (const u of unmatched) console.log(`  ${u.date}  ${u.title}`);
}
