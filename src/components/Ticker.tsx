import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { APP_NAME_PARTS } from '@/lib/config';
import {
  RECENT_RATINGS_SCREENING_LIMIT,
  tickerUserMessagesVisibleSince,
} from '@/lib/ticker-utils';
import type { Locale } from '@/lib/i18n';
import { fetchScreeningAltLocaleByIds } from '@/lib/screening-alt-locale-fetch';
import TickerStrip, { type TickerSegmentItem } from '@/components/TickerStrip';

const COOKIE_NAME = 'sofa-salon-locale';

const FALLBACK_STATIC_EN = [
  `✦ ${APP_NAME_PARTS.join('')}`,
  'UPCOMING SCREENINGS',
  'RESERVE YOUR SEAT',
  'SEE YOU THERE',
];

const FALLBACK_STATIC_ZH = [
  `✦ ${APP_NAME_PARTS.join('')}`,
  '即将放映',
  '立即选座',
  '不见不散',
];

/** Raw titles; English display is resolved in {@link TickerStrip} from {@link useLocale}. */
function buildEventSegmentItems(
  screenings: { screening_at: string; title: string; title_en?: string | null }[]
): TickerSegmentItem[] {
  return screenings.map((s) => ({
    type: 'event' as const,
    screening_at: s.screening_at,
    title: s.title,
    title_en: s.title_en ?? null,
  }));
}

export default async function Ticker() {
  const cookieStore = await cookies();
  const locale: Locale = cookieStore.get(COOKIE_NAME)?.value === 'zh' ? 'zh' : 'en';

  const supabase = await createClient();

  const hostLabel = locale === 'zh' ? '公告' : 'Announcement';

  const nowIso = new Date().toISOString();
  const userMessagesSinceIso = tickerUserMessagesVisibleSince();
  const [configRows, customRows, screeningsRes, ratingsRes, userMessagesRes, pastScreeningRes, systemEventsRes] = await Promise.all([
    supabase.from('ticker_config').select('key, value'),
    supabase.from('ticker_custom').select('content, created_by').eq('is_active', true).order('sort_order', { ascending: true }),
    supabase.from('screenings').select('id, title, screening_at').eq('is_active', true).gte('screening_at', nowIso).order('screening_at', { ascending: true }).limit(5),
    supabase.from('screenings').select('id, title').lt('screening_at', nowIso).order('screening_at', { ascending: false }).limit(RECENT_RATINGS_SCREENING_LIMIT),
    supabase
      .from('ticker_user_messages')
      .select('content, user_id')
      .eq('is_active', true)
      .gte('created_at', userMessagesSinceIso)
      .order('created_at', { ascending: true }),
    supabase.from('screenings').select('id, title').eq('is_active', true).lt('screening_at', nowIso).order('screening_at', { ascending: false }).limit(1).maybeSingle(),
    supabase
      .from('ticker_system_events')
      .select('type, title, screening_id')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false }),
  ]);

  const config: Record<string, string> = {};
  for (const r of configRows.data ?? []) {
    config[(r as { key: string }).key] = (r as { value: string }).value;
  }
  const showUpcoming = config.show_upcoming !== 'false';
  const showRatings = config.show_ratings === 'true';
  const showPastEventThankYou = config.show_past_event_thank_you === 'true';
  const showRescheduleCancelTicker = config.show_reschedule_cancel_ticker !== 'false';

  type CustomRow = { content: string; created_by?: string | null };
  const customRowsData = (customRows.data ?? []) as CustomRow[];
  const createdByIds = Array.from(new Set(customRowsData.map((r) => r.created_by).filter(Boolean))) as string[];
  let createdByNames: Record<string, string> = {};
  if (createdByIds.length > 0) {
    const { data: profileRows } = await supabase.from('profiles').select('id, display_name').in('id', createdByIds);
    for (const p of profileRows ?? []) {
      const row = p as { id: string; display_name: string | null };
      if (row.display_name) createdByNames[row.id] = row.display_name;
    }
  }
  const customSegments: string[] = customRowsData
    .map((r) => {
      const content = r.content?.trim();
      if (!content) return '';
      const name = r.created_by ? createdByNames[r.created_by]?.trim() : undefined;
      if (locale === 'zh') {
        return name ? `${hostLabel} ${name}：${content}` : `${hostLabel}：${content}`;
      }
      return name ? `${hostLabel} ${name}: ${content}` : `${hostLabel}: ${content}`;
    })
    .filter(Boolean);

  const baseSegments: string[] = customSegments.length > 0 ? customSegments : [];

  const upcomingRows = (screeningsRes.data ?? []) as { id: string; screening_at: string; title: string }[];
  const ratingsRows = (ratingsRes.data ?? []) as { id: string; title: string }[];
  const pastRow = pastScreeningRes.data as { id?: string; title?: string } | null;
  const systemEventRowsRaw = (systemEventsRes.data ?? []) as Array<{
    screening_id?: string | null;
  }>;
  const systemEventScreeningIds = systemEventRowsRaw
    .map((r) => r.screening_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  const altIds = [
    ...upcomingRows.map((r) => r.id),
    ...ratingsRows.map((r) => r.id),
    ...(pastRow?.id ? [pastRow.id] : []),
    ...systemEventScreeningIds,
  ];
  const altLocaleById = await fetchScreeningAltLocaleByIds(supabase, altIds);

  const screeningsRaw = upcomingRows.map((s) => ({
    screening_at: s.screening_at,
    title: s.title,
    title_en: altLocaleById[s.id]?.title_en ?? null,
  }));
  const eventSegmentItems = showUpcoming ? buildEventSegmentItems(screeningsRaw) : [];
  const pastForThankYou =
    pastRow?.title != null
      ? {
          title: pastRow.title,
          title_en: pastRow.id ? altLocaleById[pastRow.id]?.title_en ?? null : null,
        }
      : null;
  const pastThankYouSegments: TickerSegmentItem[] =
    showPastEventThankYou && pastForThankYou?.title
      ? [{ type: 'past_thanks' as const, title: pastForThankYou.title, title_en: pastForThankYou.title_en }]
      : [];

  let ratingSegments: TickerSegmentItem[] = [];
  if (showRatings && ratingsRows.length) {
    const ids = ratingsRows.map((s) => s.id);
    const { data: agg } = await supabase
      .from('screening_ratings')
      .select('screening_id, rating')
      .in('screening_id', ids);
    const bySid: Record<string, number[]> = {};
    for (const r of agg ?? []) {
      const sid = (r as { screening_id: string }).screening_id;
      if (!bySid[sid]) bySid[sid] = [];
      bySid[sid].push((r as { rating: number }).rating);
    }
    for (const sid of ids) {
      const arr = bySid[sid] ?? [];
      if (arr.length === 0) continue;
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      const row = ratingsRows.find((r) => r.id === sid);
      if (!row) continue;
      ratingSegments.push({
        type: 'rating_row' as const,
        title: row.title,
        title_en: altLocaleById[sid]?.title_en ?? null,
        avg,
      });
    }
  }

  const userRows = (userMessagesRes.data ?? []) as Array<{ content: string; user_id: string }>;
  const userIds = Array.from(new Set(userRows.map((r) => r.user_id).filter(Boolean)));
  let userDisplayNames: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profileRows } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
    for (const p of profileRows ?? []) {
      const row = p as { id: string; display_name: string | null };
      if (row.display_name) userDisplayNames[row.id] = row.display_name;
    }
  }
  const userSegments = userRows
    .map((r) => `${userDisplayNames[r.user_id] ?? '—'}：${r.content}`)
    .filter((s) => s.length > 0);

  type SystemEventRow = { type: string; title: string; screening_id: string | null };
  const systemEventRows = (systemEventsRes.data ?? []) as SystemEventRow[];
  const systemEventSegments: TickerSegmentItem[] = showRescheduleCancelTicker
    ? systemEventRows.map((r) => {
        const sid = r.screening_id;
        const title_en = sid ? altLocaleById[sid]?.title_en ?? null : null;
        const variant = r.type === 'cancelled' ? ('cancelled' as const) : ('rescheduled' as const);
        return {
          type: 'system_event' as const,
          variant,
          title: r.title || 'Event',
          title_en,
        };
      })
    : [];

  /** Round-robin interleave so we avoid long runs of the same type (e.g. many "upcoming" in a row). */
  const buckets: TickerSegmentItem[][] = [
    ...(baseSegments.length > 0 ? [baseSegments as TickerSegmentItem[]] : []),
    eventSegmentItems,
    pastThankYouSegments,
    ratingSegments,
    systemEventSegments,
    userSegments,
  ].filter((b) => b.length > 0);
  const indices = buckets.map(() => 0);
  const merged: TickerSegmentItem[] = [];
  const total = buckets.reduce((s, b) => s + b.length, 0);
  while (merged.length < total) {
    for (let b = 0; b < buckets.length; b++) {
      if (indices[b] < buckets[b].length) {
        merged.push(buckets[b][indices[b]++]);
      }
    }
  }

  const defaultMerged: TickerSegmentItem[] = [
    ...baseSegments,
    ...eventSegmentItems,
    ...pastThankYouSegments,
    ...ratingSegments,
    ...systemEventSegments,
  ];

  return (
    <TickerStrip
      segmentItems={merged.length > 0 ? merged : defaultMerged}
      fallbackEn={FALLBACK_STATIC_EN}
      fallbackZh={FALLBACK_STATIC_ZH}
    />
  );
}
