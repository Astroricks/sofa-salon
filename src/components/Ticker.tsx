import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { APP_NAME } from '@/lib/config';
import type { Locale } from '@/lib/i18n';

const COOKIE_NAME = 'sofa-salon-locale';

const FALLBACK_STATIC_EN = [
  `✦ ${APP_NAME}`,
  'UPCOMING SCREENINGS',
  'RESERVE YOUR SEAT',
  'SEE YOU THERE',
];

const FALLBACK_STATIC_ZH = [
  `✦ ${APP_NAME}`,
  '即将放映',
  '立即选座',
  '不见不散',
];

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
    if (diffHours < 0) segments.push(isZh ? `${s.title} · 上周` : `${s.title} · LAST WEEK`);
    else if (diffHours < 3) {
      segments.push(isZh ? `今晚 · ${timeStr} · ${s.title}` : `TONIGHT · ${timeStr} · ${s.title}`);
      segments.push(isZh ? `即将开始 · ${s.title}` : `STARTING SOON · ${s.title}`);
    } else if (diffHours < 8) segments.push(isZh ? `今天 · ${timeStr} · ${s.title}` : `TODAY · ${timeStr} · ${s.title}`);
    else if (diffDays < 2) segments.push(isZh ? `明天 · ${timeStr} · ${s.title}` : `TOMORROW · ${timeStr} · ${s.title}`);
    else if (diffDays < 7) segments.push(isZh ? `即将放映 · ${dateStr} · ${s.title}` : `UPCOMING · ${dateStr} · ${s.title}`);
    else segments.push(isZh ? `敬请期待 · ${dateStr} · ${s.title}` : `COMING SOON · ${dateStr} · ${s.title}`);
    if (s.reservations?.[0]?.count > 0) {
      const taken = s.reservations[0].count;
      segments.push(isZh ? `${s.title} · ${taken} 座已占` : `${s.title} · ${taken} SEATS TAKEN`);
    }
  }
  return segments;
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

  const [configRows, customRows, screeningsRes, ratingsRes] = await Promise.all([
    supabase.from('ticker_config').select('key, value'),
    supabase.from('ticker_custom').select('content').eq('is_active', true).order('sort_order', { ascending: true }),
    supabase.from('screenings').select('title, screening_at, reservations(count)').eq('is_active', true).order('screening_at', { ascending: true }).limit(5),
    supabase.from('screenings').select('id, title').lt('screening_at', new Date().toISOString()).order('screening_at', { ascending: false }).limit(10),
  ]);

  const config: Record<string, string> = {};
  for (const r of configRows.data ?? []) {
    config[(r as { key: string }).key] = (r as { value: string }).value;
  }
  const showUpcoming = config.show_upcoming !== 'false';
  const showRatings = config.show_ratings === 'true';

  const customLines = (customRows.data ?? []).map((r) => (r as { content: string }).content).filter(Boolean);
  const baseSegments = customLines.length > 0 ? customLines : (locale === 'zh' ? FALLBACK_STATIC_ZH : FALLBACK_STATIC_EN);

  const screenings = screeningsRes.data ?? [];
  const eventSegments = showUpcoming ? buildEventSegments(screenings, locale) : [];

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

  const fallback = locale === 'zh' ? FALLBACK_STATIC_ZH : FALLBACK_STATIC_EN;
  const allSegments = [...baseSegments, ...eventSegments, ...ratingSegments];
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
