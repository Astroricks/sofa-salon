import { politeGetJson, setGapMs } from './polite-fetch.mjs';

/** OMDb allows ~1000 req/day on free tier; one request per film. */
export function useOmdbPacing() {
  setGapMs(260);
}

/**
 * @param {string} apiKey
 * @param {string} titleEn
 * @param {number | null} [year]
 * @returns {Promise<object | null>}
 */
async function omdbFetch(apiKey, titleEn, year) {
  const params = new URLSearchParams({
    apikey: apiKey,
    t: titleEn,
    type: 'movie',
    r: 'json',
  });
  if (year != null) params.set('y', String(year));
  const data = await politeGetJson(`https://www.omdbapi.com/?${params}`);
  if (data.Response === 'False') return null;
  return data;
}

function parseRuntimeMinutes(runtime) {
  const m = String(runtime ?? '').match(/(\d+)\s*min/i);
  return m ? Number(m[1]) : null;
}

function parseOmdbYear(raw) {
  const y = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(y) ? y : null;
}

/**
 * OMDb lookup: exact title only; year may differ by up to MAX_YEAR_DELTA_FOR_MATCH.
 *
 * @param {string} apiKey
 * @param {string} titleEn
 * @param {number | null} year
 * @param {{ titlesMatchExactly: (a: string, b: string) => boolean, isYearCloseEnough: (delta: number|null) => boolean, confidenceFromYearDelta: (delta: number|null, matchedYear: number|null, expectedYear: number|null) => { confidence: string, matchNote?: string } }} match
 */
export async function omdbLookupFilm(apiKey, titleEn, year, match) {
  const attempts = year != null ? [year, null] : [null];

  for (const tryYear of attempts) {
    const data = await omdbFetch(apiKey, titleEn, tryYear);
    if (!data) continue;

    const returnedTitle = String(data.Title ?? '');
    if (!match.titlesMatchExactly(titleEn, returnedTitle)) continue;

    const externalYear = parseOmdbYear(data.Year);
    const delta =
      year != null && externalYear != null ? Math.abs(externalYear - year) : null;
    if (!match.isYearCloseEnough(delta)) continue;

    const { confidence, matchNote: baseNote } = match.confidenceFromYearDelta(
      delta,
      externalYear,
      year
    );

    let matchNote = baseNote ?? null;
    if (tryYear == null && year != null && delta != null && delta > 0) {
      matchNote = [matchNote, `OMDb found without y= filter (searched y=${year})`]
        .filter(Boolean)
        .join('; ');
    }

    const durationMinutes = parseRuntimeMinutes(data.Runtime);
    if (durationMinutes == null) {
      return {
        confidence: 'none',
        durationMinutes: null,
        externalTitle: returnedTitle,
        externalYear,
        matchNote,
        note: 'OMDb match but no Runtime',
      };
    }

    return {
      confidence,
      durationMinutes,
      externalTitle: returnedTitle,
      externalYear,
      matchNote,
      note: null,
    };
  }

  return {
    confidence: 'none',
    durationMinutes: null,
    externalTitle: null,
    externalYear: null,
    matchNote: null,
    note: 'OMDb no match',
  };
}

/**
 * @param {string} apiKey
 * @param {string} titleEn
 * @param {number | null} year
 * @returns {Promise<number | null>}
 */
export async function omdbRuntimeMinutes(apiKey, titleEn, year) {
  const data = await omdbFetch(apiKey, titleEn, year);
  if (!data) return null;
  return parseRuntimeMinutes(data.Runtime);
}
