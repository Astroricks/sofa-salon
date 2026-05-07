'use client';

import type { Locale } from '@/lib/i18n';
import { useLocale } from '@/components/LocaleProvider';
import { screeningDisplayTitle } from '@/lib/screening-display';
import { formatSystemEventTickerMessage, starsFromAvg } from '@/lib/ticker-utils';

export type TickerSegmentItem =
  | string
  | { type: 'event'; screening_at: string; title: string; title_en?: string | null }
  | { type: 'past_thanks'; title: string; title_en?: string | null }
  | { type: 'rating_row'; title: string; title_en?: string | null; avg: number }
  | { type: 'system_event'; variant: 'cancelled' | 'rescheduled'; title: string; title_en?: string | null };

/** Format event segment(s) in the viewer's local time (runs in browser = correct timezone). */
function formatEventSegmentStrings(
  item: { type: 'event'; screening_at: string; title: string; title_en?: string | null },
  locale: Locale
): string[] {
  const { screening_at, title, title_en } = item;
  const displayTitle = screeningDisplayTitle(locale, title, title_en);
  const date = new Date(screening_at);
  const timeStr = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const datePart =
    typeof screening_at === 'string' && screening_at.length >= 10
      ? screening_at.slice(0, 10) + 'T12:00:00Z'
      : screening_at;
  const dateForDisplay = new Date(datePart);
  const dateStrEn = dateForDisplay.toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
  const dateStrZh = dateForDisplay.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
  const isZh = locale === 'zh';
  const dateStr = isZh ? dateStrZh : dateStrEn;
  const now = new Date();
  const diffHours = Math.round((date.getTime() - now.getTime()) / 36e5);
  const diffDays = Math.round(diffHours / 24);
  const segments: string[] = [];
  if (diffHours < 3) {
    segments.push(
      isZh ? `今晚 · ${timeStr} · ${displayTitle}` : `TONIGHT · ${timeStr} · ${displayTitle}`
    );
    segments.push(isZh ? `即将开始 · ${displayTitle}` : `STARTING SOON · ${displayTitle}`);
  } else if (diffHours < 8) {
    segments.push(
      isZh ? `今天 · ${timeStr} · ${displayTitle}` : `TODAY · ${timeStr} · ${displayTitle}`
    );
  } else if (diffDays < 2) {
    segments.push(
      isZh ? `明天 · ${timeStr} · ${displayTitle}` : `TOMORROW · ${timeStr} · ${displayTitle}`
    );
  } else if (diffDays < 7) {
    segments.push(
      isZh ? `即将放映 · ${dateStr} · ${displayTitle}` : `UPCOMING · ${dateStr} · ${displayTitle}`
    );
  } else {
    segments.push(
      isZh ? `敬请期待 · ${dateStr} · ${displayTitle}` : `COMING SOON · ${dateStr} · ${displayTitle}`
    );
  }
  return segments;
}

function pastThanksStrings(
  item: { type: 'past_thanks'; title: string; title_en?: string | null },
  locale: Locale
): string[] {
  const displayTitle = screeningDisplayTitle(locale, item.title, item.title_en);
  if (!displayTitle) return [];
  const isZh = locale === 'zh';
  return [isZh ? `谢谢大家观看《${displayTitle}》` : `Thank you for watching ${displayTitle}`];
}

function ratingRowString(
  item: { type: 'rating_row'; title: string; title_en?: string | null; avg: number },
  locale: Locale
): string {
  const displayTitle = screeningDisplayTitle(locale, item.title, item.title_en);
  return `${displayTitle} ${starsFromAvg(item.avg)} ${item.avg.toFixed(1)}`;
}

function expandSegments(
  items: TickerSegmentItem[],
  locale: Locale
): string[] {
  const out: string[] = [];
  for (const item of items) {
    if (typeof item === 'string') {
      out.push(item);
    } else if (item.type === 'event') {
      out.push(...formatEventSegmentStrings(item, locale));
    } else if (item.type === 'past_thanks') {
      out.push(...pastThanksStrings(item, locale));
    } else if (item.type === 'rating_row') {
      out.push(ratingRowString(item, locale));
    } else if (item.type === 'system_event') {
      out.push(formatSystemEventTickerMessage(locale, item.variant, item.title, item.title_en));
    }
  }
  return out;
}

interface Props {
  segmentItems: TickerSegmentItem[];
  fallbackEn: string[];
  fallbackZh: string[];
}

export default function TickerStrip({
  segmentItems,
  fallbackEn,
  fallbackZh,
}: Props) {
  const { locale } = useLocale();
  const fallback = locale === 'zh' ? fallbackZh : fallbackEn;
  const allSegments =
    segmentItems.length > 0
      ? expandSegments(segmentItems, locale)
      : fallback;
  const loopSegments =
    allSegments.length > 0 ? [...allSegments, ...allSegments] : [...fallback, ...fallback];

  return (
    <div
      className="ticker-wrap"
      style={{
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      <div className="animate-ticker" style={{ display: 'inline-block' }}>
        {loopSegments.map((seg, i) => (
          <span
            key={i}
            className="ticker-text"
            style={{
              fontSize: 12,
              letterSpacing: 2,
              textTransform: 'uppercase',
              padding: '0 40px',
            }}
          >
            {seg}
            <span style={{ opacity: 0.6, padding: '0 8px' }}>·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
