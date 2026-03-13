import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { APP_NAME_PARTS } from '@/lib/config';
import type { Locale } from '@/lib/i18n';

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

/** Build ticker segments for upcoming screenings only (no past events, no seat counts). */
function buildEventSegments(screenings: any[], locale: Locale): string[] {
  const segments: string[] = [];
  const isZh = locale === 'zh';
  for (const s of screenings) {
    const date = new Date(s.screening_at);
    const now = new Date();
    const diffHours = Math.round((date.getTime() - now.getTime()) / 36e5);
    const diffDays = Math.round(diffHours / 24);
    const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const dateStrEn = date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', weekday: 'short' });
    const dateStrZh = date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
    const dateStr = isZh ? dateStrZh : dateStrEn;
    if (diffHours < 3) {
      segments.push(isZh ? `今晚 · ${timeStr} · ${s.title}` : `TONIGHT · ${timeStr} · ${s.title}`);
      segments.push(isZh ? `即将开始 · ${s.title}` : `STARTING SOON · ${s.title}`);
    } else if (diffHours < 8) segments.push(isZh ? `今天 · ${timeStr} · ${s.title}` : `TODAY · ${timeStr} · ${s.title}`);
    else if (diffDays < 2) segments.push(isZh ? `明天 · ${timeStr} · ${s.title}` : `TOMORROW · ${timeStr} · ${s.title}`);
    else if (diffDays < 7) segments.push(isZh ? `即将放映 · ${dateStr} · ${s.title}` : `UPCOMING · ${dateStr} · ${s.title}`);
    else segments.push(isZh ? `敬请期待 · ${dateStr} · ${s.title}` : `COMING SOON · ${dateStr} · ${s.title}`);
  }
  return segments;
}

/** One segment for the most recent past screening, e.g. "谢谢大家观看《少年派》". */
function buildPastThankYouSegment(pastScreening: { title: string } | null, locale: Locale): string[] {
  if (!pastScreening?.title) return [];
  const isZh = locale === 'zh';
  return [isZh ? `谢谢大家观看《${pastScreening.title}》` : `Thank you for watching ${pastScreening.title}`];
}

function starsFromAvg(avg: number): string {
  const full = Math.round(avg);
  const empty = 5 - full;
  return '★'.repeat(full) + '☆'.repeat(empty);
}

export default async function Ticker() {
  const cookieStore = await cookies();
  const locale: Locale = cookieStore.get(COOKIE_NAME)?.value === 'zh' ? 'zh' : 'en';

  const supabase = await createClient();

  const hostLabel = locale === 'zh' ? '公告' : 'Announcement';

  const nowIso = new Date().toISOString();
  const [configRows, customRows, screeningsRes, ratingsRes, userMessagesRes, pastScreeningRes, systemEventsRes] = await Promise.all([
    supabase.from('ticker_config').select('key, value'),
    supabase.from('ticker_custom').select('content, created_by').eq('is_active', true).order('sort_order', { ascending: true }),
    supabase.from('screenings').select('title, screening_at').eq('is_active', true).gte('screening_at', nowIso).order('screening_at', { ascending: true }).limit(5),
    supabase.from('screenings').select('id, title').lt('screening_at', nowIso).order('screening_at', { ascending: false }).limit(10),
    supabase.from('ticker_user_messages').select('content, user_id').eq('is_active', true).order('created_at', { ascending: true }),
    supabase.from('screenings').select('title').eq('is_active', true).lt('screening_at', nowIso).order('screening_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('ticker_system_events').select('type, title').gt('expires_at', nowIso).order('created_at', { ascending: false }),
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

  const fallback = locale === 'zh' ? FALLBACK_STATIC_ZH : FALLBACK_STATIC_EN;
  const baseSegments = customSegments.length > 0 ? customSegments : fallback;

  const screenings = screeningsRes.data ?? [];
  const eventSegments = showUpcoming ? buildEventSegments(screenings, locale) : [];
  const pastThankYouSegments = showPastEventThankYou ? buildPastThankYouSegment(pastScreeningRes.data as { title: string } | null, locale) : [];

  let ratingSegments: string[] = [];
  if (showRatings && ratingsRes.data?.length) {
    const ids = (ratingsRes.data as { id: string }[]).map((s) => s.id);
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
    const titles = new Map((ratingsRes.data as { id: string; title: string }[]).map((s) => [s.id, s.title]));
    for (const sid of ids) {
      const arr = bySid[sid] ?? [];
      if (arr.length === 0) continue;
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      const title = titles.get(sid) ?? 'Film';
      ratingSegments.push(`${title} ${starsFromAvg(avg)} ${avg.toFixed(1)}`);
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

  type SystemEventRow = { type: string; title: string };
  const systemEventRows = (systemEventsRes.data ?? []) as SystemEventRow[];
  const systemEventSegments: string[] = showRescheduleCancelTicker
    ? systemEventRows.map((r) => {
        const t = r.title || 'Event';
        if (r.type === 'cancelled') {
          return locale === 'zh' ? `活动《${t}》已取消` : `Event "${t}" has been cancelled`;
        }
        return locale === 'zh' ? `活动《${t}》已改期` : `Event "${t}" has been rescheduled`;
      })
    : [];

  /** Round-robin interleave so we avoid long runs of the same type (e.g. many "upcoming" in a row). */
  const buckets: string[][] = [baseSegments, eventSegments, pastThankYouSegments, ratingSegments, systemEventSegments, userSegments].filter((b) => b.length > 0);
  const indices = buckets.map(() => 0);
  const merged: string[] = [];
  const total = buckets.reduce((s, b) => s + b.length, 0);
  while (merged.length < total) {
    for (let b = 0; b < buckets.length; b++) {
      if (indices[b] < buckets[b].length) {
        merged.push(buckets[b][indices[b]++]);
      }
    }
  }

  const allSegments = merged.length > 0 ? merged : [...baseSegments, ...eventSegments, ...pastThankYouSegments, ...ratingSegments, ...systemEventSegments];
  const loopSegments = allSegments.length > 0 ? [...allSegments, ...allSegments] : [...fallback, ...fallback];

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
