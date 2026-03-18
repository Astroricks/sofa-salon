/**
 * Pure helpers for ticker display logic (e.g. rating stars).
 * Kept in lib so they can be unit-tested without Supabase.
 */

/** Number of past screenings whose ratings are shown on the ticker (most recent first). */
export const RECENT_RATINGS_SCREENING_LIMIT = 2;

/**
 * Renders a 5-star string from an average rating (e.g. 3.4 → ★★★☆☆).
 */
export function starsFromAvg(avg: number): string {
  const full = Math.min(5, Math.max(0, Math.round(avg)));
  const empty = 5 - full;
  return '★'.repeat(full) + '☆'.repeat(empty);
}
