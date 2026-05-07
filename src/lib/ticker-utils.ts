/**
 * Pure helpers for ticker display logic (e.g. rating stars).
 * Kept in lib so they can be unit-tested without Supabase.
 */

import type { Locale } from '@/lib/i18n';
import { screeningDisplayTitle } from '@/lib/screening-display';

/** Number of past screenings whose ratings are shown on the ticker (most recent first). */
export const RECENT_RATINGS_SCREENING_LIMIT = 2;

/**
 * Reschedule / cancel lines in the floating ticker; uses English title when locale is EN.
 */
export function formatSystemEventTickerMessage(
  locale: Locale,
  variant: 'cancelled' | 'rescheduled',
  title: string,
  titleEn?: string | null
): string {
  let displayTitle = screeningDisplayTitle(locale, title, titleEn).trim();
  if (!displayTitle) displayTitle = locale === 'zh' ? '活动' : 'Event';
  const isZh = locale === 'zh';
  if (variant === 'cancelled') {
    return isZh ? `活动《${displayTitle}》已取消` : `Event "${displayTitle}" has been cancelled`;
  }
  return isZh ? `活动《${displayTitle}》已改期` : `Event "${displayTitle}" has been rescheduled`;
}

/**
 * Renders a 5-star string from an average rating (e.g. 3.4 → ★★★☆☆).
 */
export function starsFromAvg(avg: number): string {
  const full = Math.min(5, Math.max(0, Math.round(avg)));
  const empty = 5 - full;
  return '★'.repeat(full) + '☆'.repeat(empty);
}
