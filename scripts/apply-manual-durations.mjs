/**
 * Merge manual duration_minutes into historical-duration-omdb.json and regenerate SQL.
 *
 * Usage:
 *   node scripts/apply-manual-durations.mjs scripts/data/manual-durations-28.csv
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_JSON = join(__dirname, 'data/historical-duration-omdb.json');
const OUT_REVIEW = join(__dirname, 'data/historical-duration-omdb-review.json');
const OUT_APPROX = join(__dirname, 'data/historical-duration-omdb-approximations.json');
const OUT_SQL = join(__dirname, '../supabase-sql/41-patch-historical-duration-minutes.sql');

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(',').map((h) => h.trim());
  const titleIdx = header.indexOf('title_en');
  const yearIdx = header.indexOf('year');
  const durIdx = header.indexOf('duration_minutes');
  if (titleIdx < 0 || yearIdx < 0 || durIdx < 0) {
    throw new Error('CSV must have title_en,year,duration_minutes columns');
  }

  /** @type {{ titleEn: string, year: number, durationMinutes: number }[]} */
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 3) continue;
    const titleEn = parts.slice(0, parts.length - 2).join(',').trim();
    const year = Number.parseInt(parts[parts.length - 2].trim(), 10);
    const durationMinutes = Number.parseInt(parts[parts.length - 1].trim(), 10);
    if (!titleEn || !Number.isFinite(year) || !Number.isFinite(durationMinutes) || durationMinutes < 1) {
      throw new Error(`Invalid row ${i + 1}: ${lines[i]}`);
    }
    rows.push({ titleEn, year, durationMinutes });
  }
  return rows;
}

function rowKey(titleEn, year) {
  return `${titleEn}\0${year}`;
}

function buildReview(report) {
  return report.filter(
    (r) =>
      r.confidence === 'ambiguous' ||
      r.durationMinutes == null ||
      (typeof r.note === 'string' && r.note.startsWith('below'))
  );
}

function buildApproximations(report) {
  return report
    .filter(
      (r) =>
        r.durationMinutes != null &&
        r.matchNote &&
        (r.yearDelta == null || (r.yearDelta > 0 && r.yearDelta <= 2))
    )
    .map((r) => ({
      id: r.id,
      titleEn: r.titleEn,
      year: r.year,
      durationMinutes: r.durationMinutes,
      matchedBy: r.matchedBy,
      confidence: r.confidence,
      externalTitle: r.externalTitle,
      externalYear: r.externalYear,
      yearDelta: r.yearDelta,
      matchNote: r.matchNote,
    }));
}

const csvPath = process.argv[2] ?? join(__dirname, 'data/manual-durations-28.csv');
const manual = parseCsv(readFileSync(csvPath, 'utf8'));
const report = JSON.parse(readFileSync(OUT_JSON, 'utf8'));

const byKey = new Map(report.map((r) => [rowKey(r.titleEn, r.year), r]));
let applied = 0;
const notFound = [];

for (const m of manual) {
  const entry = byKey.get(rowKey(m.titleEn, m.year));
  if (!entry) {
    notFound.push(m);
    continue;
  }
  entry.durationMinutes = m.durationMinutes;
  entry.matchedBy = 'manual';
  entry.confidence = 'high';
  entry.matchNote = 'manual entry';
  entry.note = null;
  applied++;
}

if (notFound.length) {
  console.error('No report row for:', notFound.map((x) => `${x.titleEn} (${x.year})`).join(', '));
  process.exit(1);
}

const patches = report.filter((r) => r.durationMinutes != null);
const review = buildReview(report);
const approximations = buildApproximations(report);

writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
writeFileSync(OUT_REVIEW, JSON.stringify(review, null, 2));
writeFileSync(OUT_APPROX, JSON.stringify(approximations, null, 2));

const sqlLines = [
  '-- =============================================================================',
  '-- 41 — Patch duration_minutes (one-off)',
  '-- =============================================================================',
  `-- Generated: node scripts/apply-manual-durations.mjs ${csvPath}`,
  `-- Rows: ${patches.length} updates`,
  '-- Only sets duration where currently NULL.',
  '-- =============================================================================',
  '',
];

for (const p of patches) {
  sqlLines.push(
    `UPDATE screenings SET duration_minutes = ${p.durationMinutes} WHERE id = '${p.id}'::uuid AND duration_minutes IS NULL;`
  );
}
writeFileSync(OUT_SQL, sqlLines.join('\n') + '\n');

const missing = report.filter((r) => !r.durationMinutes);
console.log(`Applied ${applied} manual durations.`);
console.log(`Report: ${patches.length}/${report.length} with duration (${missing.length} still missing).`);
console.log(`Wrote ${OUT_JSON}`);
console.log(`SQL: ${OUT_SQL} (${patches.length} UPDATEs)`);
if (missing.length) {
  console.log('Still missing:', missing.map((r) => r.titleEn).join(', '));
}
