/**
 * Fetch runtime (duration_minutes) for past screenings via OMDb.
 *
 * Usage:
 *   node scripts/fetch-historical-durations-omdb.mjs
 *   node scripts/fetch-historical-durations-omdb.mjs --resume
 *   node scripts/fetch-historical-durations-omdb.mjs --apply
 *
 * Manual / Gemini gaps: scripts/apply-manual-durations.mjs
 */
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { buildTitleEnMap, titleEnForRow } from './lib/match-letterboxd-en.mjs';
import { loadEnvLocal } from './lib/load-env-local.mjs';
import {
  parseCsvLine,
  parseSheetDate,
  extractFilmYear,
  stripTitleYearSuffix,
} from './lib/parse-screening-csv.mjs';
import { currentGapMs } from './lib/polite-fetch.mjs';
import { omdbLookupFilm, useOmdbPacing } from './lib/omdb-runtime.mjs';
import {
  mergeReportFromDisk,
  orderRowsForParallelPass,
  hasProviderAttempt,
  withDurationFetchLock,
} from './lib/duration-fetch-coord.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROVIDER = 'omdb';
const CHECKPOINT_EVERY = 25;
const OUT_JSON = join(__dirname, 'data/historical-duration-omdb.json');
const OUT_REVIEW = join(__dirname, 'data/historical-duration-omdb-review.json');
const OUT_APPROX = join(__dirname, 'data/historical-duration-omdb-approximations.json');
const OUT_SQL = join(__dirname, '../supabase-sql/41-patch-historical-duration-minutes.sql');

const CSV_PATH = join(__dirname, 'data/ziggygraph-screenings-zh.csv');
const DIARY_PATH = join(__dirname, 'data/letterboxd-diary.csv');

/** @typedef {{ id: string, title: string, titleEn: string, year: number | null, source: string }} Row */

function parseArgs(argv) {
  const opts = {
    source: 'db',
    apply: false,
    dryRun: false,
    limit: null,
    resume: false,
    retryOmdb: false,
    reverse: false,
  };
  for (const a of argv) {
    if (a === '--apply') opts.apply = true;
    if (a === '--dry-run') opts.dryRun = true;
    if (a === '--resume') opts.resume = true;
    if (a === '--retry-omdb') opts.retryOmdb = true;
    if (a === '--reverse') opts.reverse = true;
    if (a.startsWith('--source=')) opts.source = a.slice('--source='.length);
    if (a.startsWith('--limit=')) opts.limit = Number(a.slice('--limit='.length));
  }
  if (opts.limit != null && (!Number.isFinite(opts.limit) || opts.limit < 1)) {
    throw new Error('--limit must be a positive number');
  }
  if (!['db', 'csv'].includes(opts.source)) {
    throw new Error('--source must be db or csv');
  }
  return opts;
}

function baseEntry(row) {
  return {
    id: row.id,
    title: row.title,
    titleEn: row.titleEn,
    year: row.year,
    source: row.source,
    matchedBy: null,
    confidence: 'none',
    externalTitle: null,
    externalYear: null,
    durationMinutes: null,
    note: null,
    matchNote: null,
    yearDelta: null,
    attempts: [],
  };
}

function applyLookupResult(entry, result) {
  const attempts = [
    ...(entry.attempts ?? []),
    {
      provider: PROVIDER,
      confidence: result.confidence,
      note: result.note,
    },
  ];

  if (result.durationMinutes != null) {
    return {
      ...entry,
      matchedBy: PROVIDER,
      confidence: result.confidence,
      externalTitle: result.externalTitle,
      externalYear: result.externalYear,
      durationMinutes: result.durationMinutes,
      matchNote: result.matchNote ?? null,
      yearDelta: result.yearDelta ?? null,
      note: null,
      attempts,
    };
  }

  return {
    ...entry,
    confidence: result.confidence,
    externalTitle: result.externalTitle ?? entry.externalTitle,
    externalYear: result.externalYear ?? entry.externalYear,
    matchNote: result.matchNote ?? entry.matchNote,
    yearDelta: result.yearDelta ?? entry.yearDelta,
    note: result.note,
    attempts,
  };
}

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

function isMostlyLatin(s) {
  if (!s?.trim()) return false;
  const latin = (s.match(/[A-Za-z0-9]/g) || []).length;
  const cjk = (s.match(/[\u4e00-\u9fff]/g) || []).length;
  return latin > 0 && cjk === 0;
}

/** @type {typeof import('../src/lib/film-title-match.ts')} */
let titleMatch;
async function loadTitleMatch() {
  if (!titleMatch) {
    titleMatch = await import('../src/lib/film-title-match.ts');
  }
  return titleMatch;
}

/** @returns {Row[]} */
function loadRowsFromCsv() {
  if (!existsSync(DIARY_PATH)) {
    throw new Error(
      'Missing scripts/data/letterboxd-diary.csv — export your Letterboxd diary and save it there (see scripts/data/README.md).'
    );
  }
  const titleEnMap = buildTitleEnMap(CSV_PATH, DIARY_PATH);
  const raw = readFileSync(CSV_PATH, 'utf8').trim();
  /** @type {Row[]} */
  const rows = [];
  for (const line of raw.split(/\r?\n/).filter(Boolean)) {
    const [date, title] = parseCsvLine(line);
    if (!date?.match(/^\d{4}\.\d{1,2}\.\d{1,2}$/)) continue;
    const titleCsv = title.trim();
    const titleZh = stripTitleYearSuffix(titleCsv);
    const isoDate = parseSheetDate(date);
    let titleEn = titleEnForRow(titleEnMap, isoDate, titleCsv);
    if (!titleEn && isMostlyLatin(titleZh)) titleEn = titleZh;
    if (!titleEn) continue;
    rows.push({
      id: stableScreeningId(date, titleCsv),
      title: titleZh,
      titleEn,
      year: extractFilmYear(titleCsv),
      source: 'csv',
    });
  }
  return rows;
}

async function loadRowsFromDb(supabase) {
  const { data, error } = await supabase
    .from('screenings')
    .select('id, title, title_en, year, screening_at, duration_minutes')
    .is('duration_minutes', null)
    .not('title_en', 'is', null)
    .lt('screening_at', new Date().toISOString())
    .order('screening_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    titleEn: r.title_en,
    year: r.year != null ? Number(r.year) : null,
    source: 'db',
  }));
}

async function lookupOmdb(apiKey, row) {
  const { titlesMatchExactly, isYearCloseEnough, matchConfidenceFromTitleYear } =
    await loadTitleMatch();
  const omdb = await omdbLookupFilm(apiKey, row.titleEn, row.year, {
    titlesMatchExactly,
    isYearCloseEnough,
    confidenceFromYearDelta: matchConfidenceFromTitleYear,
  });
  return {
    confidence: omdb.confidence,
    externalTitle: omdb.externalTitle,
    externalYear: omdb.externalYear,
    durationMinutes: omdb.durationMinutes,
    matchNote: omdb.matchNote,
    yearDelta:
      row.year != null && omdb.externalYear != null ? Math.abs(omdb.externalYear - row.year) : null,
    note: omdb.note ?? (omdb.durationMinutes == null ? 'OMDb no match' : null),
  };
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
      externalTitle: r.externalTitle,
      externalYear: r.externalYear,
      yearDelta: r.yearDelta,
      matchNote: r.matchNote,
    }));
}

function buildReview(report) {
  return report.filter((r) => r.durationMinutes == null);
}

async function writeOutputs(report, review, patches, opts) {
  const approximations = buildApproximations(report);
  await withDurationFetchLock(() => {
    writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
    writeFileSync(OUT_REVIEW, JSON.stringify(review, null, 2));
    writeFileSync(OUT_APPROX, JSON.stringify(approximations, null, 2));

    const sqlLines = [
      '-- =============================================================================',
      '-- 41 — Patch duration_minutes (one-off)',
      '-- =============================================================================',
      `-- Generated: node scripts/fetch-historical-durations-omdb.mjs (--source=${opts.source})`,
      `-- Rows: ${patches.length} updates`,
      '-- Only sets duration where currently NULL.',
      '-- Review scripts/data/historical-duration-omdb-review.json before running.',
      '-- =============================================================================',
      '',
    ];

    for (const p of patches) {
      sqlLines.push(
        `UPDATE screenings SET duration_minutes = ${p.durationMinutes} WHERE id = '${p.id}'::uuid AND duration_minutes IS NULL;`
      );
    }

    if (!opts.dryRun) {
      writeFileSync(OUT_SQL, sqlLines.join('\n') + '\n');
    }
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const env = loadEnvLocal();
  const apiKey = env.OMDB_API_KEY ?? process.env.OMDB_API_KEY;
  if (!apiKey) {
    console.error('Set OMDB_API_KEY in .env.local (https://www.omdbapi.com/apikey.aspx)');
    process.exit(1);
  }

  useOmdbPacing();

  /** @type {Row[]} */
  let rows;
  let supabase = null;

  if (opts.source === 'csv') {
    rows = loadRowsFromCsv();
    console.log(`CSV source: ${rows.length} rows with English title`);
  } else {
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error('For --source=db set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }
    supabase = createClient(url, key);
    rows = await loadRowsFromDb(supabase);
    console.log(`DB source: ${rows.length} past screenings missing duration_minutes (with title_en)`);
  }

  if (opts.limit != null && rows.length > opts.limit) {
    rows = rows.slice(0, opts.limit);
    console.log(`Limited to first ${opts.limit} rows`);
  }

  /** @type {Map<string, Record<string, unknown>>} */
  const reportById = new Map();
  /** @type {Map<string, { id: string, durationMinutes: number }>} */
  const patchById = new Map();

  if (opts.resume) {
    const n = mergeReportFromDisk(reportById, patchById, OUT_JSON);
    if (n > 0 || patchById.size > 0) {
      console.log(`Resume: ${patchById.size} rows with duration (${n} merged from disk)\n`);
    }
  }

  const orderedRows = orderRowsForParallelPass(rows, reportById, { reverse: opts.reverse });
  const toFetch = orderedRows.filter((r) => {
    const entry = reportById.get(r.id);
    if (entry?.durationMinutes != null) return false;
    if (hasProviderAttempt(entry, PROVIDER) && !opts.retryOmdb) return false;
    return true;
  });

  console.log(`OMDb pass: ${toFetch.length} films (gap ~${currentGapMs()}ms)\n`);

  let fetched = 0;
  for (let i = 0; i < toFetch.length; i++) {
    const row = toFetch[i];
    fetched++;

    if (fetched % 5 === 0) {
      mergeReportFromDisk(reportById, patchById, OUT_JSON);
    }

    let entry = reportById.get(row.id) ?? baseEntry(row);

    try {
      const result = await lookupOmdb(apiKey, row);
      entry = applyLookupResult(entry, result);
      if (entry.durationMinutes != null) {
        patchById.set(row.id, { id: row.id, durationMinutes: entry.durationMinutes });
      }
    } catch (err) {
      entry = applyLookupResult(entry, {
        confidence: 'none',
        externalTitle: null,
        externalYear: null,
        durationMinutes: null,
        matchNote: null,
        yearDelta: null,
        note: err instanceof Error ? err.message : String(err),
      });
    }

    reportById.set(row.id, entry);
    const status =
      entry.durationMinutes != null ? `${entry.durationMinutes} min` : entry.note ?? 'none';
    const approx = entry.matchNote ? ` — ${entry.matchNote}` : '';
    console.log(`[${i + 1}/${toFetch.length}] ${row.titleEn} (${row.year ?? '?'}) → ${status}${approx}`);

    if (fetched % CHECKPOINT_EVERY === 0) {
      mergeReportFromDisk(reportById, patchById, OUT_JSON);
      const partialReport = rows.map((r) => reportById.get(r.id)).filter(Boolean);
      await writeOutputs(partialReport, buildReview(partialReport), [...patchById.values()], opts);
      console.log(`  checkpoint (${fetched} lookups)`);
    }
  }

  mergeReportFromDisk(reportById, patchById, OUT_JSON);
  const report = rows.map((r) => reportById.get(r.id) ?? baseEntry(r)).filter(Boolean);
  const review = buildReview(report);
  const patches = [...patchById.values()];
  await writeOutputs(report, review, patches, opts);

  const matched = report.filter((r) => r.durationMinutes != null).length;
  const approxCount = buildApproximations(report).length;
  console.log(`\nMatched: ${matched}/${rows.length} (${review.length} still missing)`);
  if (approxCount > 0) {
    console.log(`Year ±1/±2 (exact title): ${approxCount} rows → ${OUT_APPROX}`);
  }
  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Review: ${OUT_REVIEW}`);
  if (!opts.dryRun) console.log(`SQL: ${OUT_SQL} (${patches.length} UPDATEs)`);

  if (opts.apply) {
    if (!supabase) {
      console.error('--apply requires --source=db');
      process.exit(1);
    }
    let applied = 0;
    for (const p of patches) {
      const { error } = await supabase
        .from('screenings')
        .update({ duration_minutes: p.durationMinutes })
        .eq('id', p.id)
        .is('duration_minutes', null);
      if (error) console.error(`Failed ${p.id}:`, error.message);
      else applied++;
    }
    console.log(`Applied ${applied} updates via Supabase.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
