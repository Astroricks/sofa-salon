/** Catalog/search hit with title + optional release year (YYYY-MM-DD). */
export type FilmCatalogHit = {
  id: number | string;
  title: string;
  release_date?: string;
};

export type FilmTitlePickConfidence = 'high' | 'medium' | 'low' | 'none' | 'ambiguous';

export type FilmTitlePickResult =
  | { confidence: 'none' }
  | { confidence: 'ambiguous'; candidates: FilmCatalogHit[]; matchNote?: string }
  | {
      confidence: Exclude<FilmTitlePickConfidence, 'none' | 'ambiguous'>;
      hit: FilmCatalogHit;
      matchNote?: string;
      yearDelta?: number | null;
    };

/** Accept same-title matches only when catalog year is within this many years of ours. */
export const MAX_YEAR_DELTA_FOR_MATCH = 2;

/** Normalize titles for equality (English). */
export function normalizeTitleForMatch(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 0 = different title, 3 = exact normalized title. */
export function titleMatchScore(wantTitle: string, gotTitle: string): 0 | 3 {
  const want = normalizeTitleForMatch(wantTitle);
  const got = normalizeTitleForMatch(gotTitle);
  if (!want || !got) return 0;
  return got === want ? 3 : 0;
}

export function titlesMatchExactly(wantTitle: string, gotTitle: string): boolean {
  return titleMatchScore(wantTitle, gotTitle) === 3;
}

export function releaseYearFromDate(releaseDate: string | undefined): number | null {
  if (!releaseDate || releaseDate.length < 4) return null;
  const y = Number.parseInt(releaseDate.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

function yearDelta(expected: number | null, matched: number | null): number | null {
  if (expected == null || matched == null) return null;
  return Math.abs(matched - expected);
}

export function isYearCloseEnough(delta: number | null): boolean {
  if (delta == null) return true;
  return delta <= MAX_YEAR_DELTA_FOR_MATCH;
}

/** For OMDb responses that already matched on title. */
export function matchConfidenceFromTitleYear(
  delta: number | null,
  matchedYear: number | null,
  expectedYear: number | null
): { confidence: 'high'; matchNote?: string } {
  if (delta === 0 || delta == null) {
    return { confidence: 'high' };
  }
  return {
    confidence: 'high',
    matchNote: `same title, year ±${delta} (catalog ${matchedYear} vs our ${expectedYear})`,
  };
}

type ScoredRow = {
  hit: FilmCatalogHit;
  matchedYear: number | null;
  delta: number | null;
};

function scoreResult(r: FilmCatalogHit, titleEn: string, year: number | null): ScoredRow | null {
  if (titleMatchScore(titleEn, r.title) !== 3) return null;
  const matchedYear = releaseYearFromDate(r.release_date);
  return {
    hit: r,
    matchedYear,
    delta: yearDelta(year, matchedYear),
  };
}

/** Pick one catalog hit: exact English title, release year equal or within ±2. */
export function pickFilmByExactTitle(
  results: FilmCatalogHit[],
  opts: { titleEn: string; year: number | null }
): FilmTitlePickResult {
  if (!results.length) return { confidence: 'none' };

  if (!normalizeTitleForMatch(opts.titleEn)) return { confidence: 'none' };

  const scored = results
    .map((r) => scoreResult(r, opts.titleEn, opts.year))
    .filter((s): s is ScoredRow => s != null);

  if (!scored.length) return { confidence: 'none' };

  const withinYear = scored.filter((s) => isYearCloseEnough(s.delta));
  if (!withinYear.length) return { confidence: 'none' };

  withinYear.sort((a, b) => {
    const da = a.delta ?? 0;
    const db = b.delta ?? 0;
    if (da !== db) return da - db;
    return String(a.hit.id).localeCompare(String(b.hit.id));
  });

  const best = withinYear[0];
  const bestDelta = best.delta ?? 0;
  const tiedAtBest = withinYear.filter((s) => (s.delta ?? 0) === bestDelta);

  if (tiedAtBest.length > 1 && bestDelta === 0) {
    return {
      confidence: 'ambiguous',
      candidates: tiedAtBest.map((s) => s.hit).slice(0, 5),
      matchNote: 'multiple exact-title matches in same release year',
    };
  }

  if (tiedAtBest.length > 1) {
    const chosen = tiedAtBest[0];
    const { confidence, matchNote } = matchConfidenceFromTitleYear(
      chosen.delta,
      chosen.matchedYear,
      opts.year
    );
    return {
      confidence,
      hit: chosen.hit,
      matchNote: `${matchNote ?? 'same title'}; picked closest year among ${tiedAtBest.length} hits`,
      yearDelta: chosen.delta,
    };
  }

  const { confidence, matchNote } = matchConfidenceFromTitleYear(
    best.delta,
    best.matchedYear,
    opts.year
  );

  return {
    confidence,
    hit: best.hit,
    matchNote,
    yearDelta: best.delta,
  };
}
