import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { reservationIsPresent } from '@/lib/attendance';
import { APP_NAME_PARTS } from '@/lib/config';
import BackButton from '@/components/BackButton';
import { getT, localeFromValue } from '@/lib/i18n';
import RatingsExportButtons, { type RatingsExportRow } from './RatingsExportButtons';
import { formatScreeningInVenue } from '@/lib/screening-datetime';

export default async function AdminRatingsPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const locale = localeFromValue(cookieStore.get('sofa-salon-locale')?.value);
  const t = getT(locale);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return (
      <div className="p-8 font-mono text-[13px] text-[#f87171]">{t.admin.adminOnly}</div>
    );
  }

  const now = new Date().toISOString();
  const { data: pastScreenings } = await supabase
    .from('screenings')
    .select('id, title, description, year, director, duration_minutes, screening_at')
    .lt('screening_at', now)
    .order('screening_at', { ascending: false });

  const ids = (pastScreenings ?? []).map((s) => s.id);
  const ratingStats: Record<string, { count: number; avg: number }> = {};
  const attendanceCount: Record<string, number> = {};

  if (ids.length > 0) {
    const [ratingsRes, reservationsRes] = await Promise.all([
      supabase
        .from('screening_ratings')
        .select('screening_id, rating')
        .in('screening_id', ids),
      supabase
        .from('reservations')
        .select('screening_id, attended')
        .in('screening_id', ids),
    ]);

    const byScreening: Record<string, number[]> = {};
    for (const r of ratingsRes.data ?? []) {
      const sid = (r as { screening_id: string }).screening_id;
      if (!byScreening[sid]) byScreening[sid] = [];
      byScreening[sid].push((r as { rating: number }).rating);
    }
    for (const sid of ids) {
      const arr = byScreening[sid] ?? [];
      ratingStats[sid] = {
        count: arr.length,
        avg: arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
      };
    }

    for (const sid of ids) attendanceCount[sid] = 0;
    for (const r of reservationsRes.data ?? []) {
      if (reservationIsPresent((r as { attended: boolean | null }).attended)) {
        const sid = (r as { screening_id: string }).screening_id;
        attendanceCount[sid] = (attendanceCount[sid] ?? 0) + 1;
      }
    }
  }

  const exportData: RatingsExportRow[] = (pastScreenings ?? []).map((s) => {
    const stats = ratingStats[s.id] ?? { count: 0, avg: 0 };
    return {
      id: s.id,
      title: s.title ?? '',
      description: (s as { description?: string | null }).description ?? null,
      year: (s as { year?: number | null }).year ?? null,
      director: (s as { director?: string | null }).director ?? null,
      duration_minutes: (s as { duration_minutes?: number | null }).duration_minutes ?? null,
      screening_at: s.screening_at,
      attendance_count: attendanceCount[s.id] ?? 0,
      rating_count: stats.count,
      rating_avg: stats.avg,
    };
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 bg-[#0f0f0f]">
      <BackButton className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] hover:text-[#e8c84a] mb-6 inline-block transition-colors">
        {t.admin.backToAdmin}
      </BackButton>
      <h1 className="font-mono text-xl text-[#e8e4dc] mb-1">
        {APP_NAME_PARTS[0]}{APP_NAME_PARTS.slice(1).join('')}{' '}
        <span className="text-[#e8c84a]">{t.admin.title}</span>
      </h1>
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-6">
        {t.admin.ratingsReport}
      </p>

      <RatingsExportButtons data={exportData} />

      <div className="overflow-x-auto">
        <table className="w-full font-mono text-[13px] border-collapse">
          <thead>
            <tr className="text-left border-b border-[#2a2a2a]">
              <th className="py-3 pr-4 text-[#e8c84a] uppercase tracking-wider">{t.admin.pastScreenings}</th>
              <th className="py-3 pr-4 text-[#888888] uppercase tracking-wider">{t.admin.date}</th>
              <th className="py-3 pr-4 text-[#888888] uppercase tracking-wider">{t.admin.numRatings}</th>
              <th className="py-3 text-[#888888] uppercase tracking-wider">{t.admin.avgRating}</th>
            </tr>
          </thead>
          <tbody>
            {(pastScreenings ?? []).map((s) => {
              const stats = ratingStats[s.id] ?? { count: 0, avg: 0 };
              return (
                <tr key={s.id} className="border-b border-[#2a2a2a]">
                  <td className="py-3 pr-4 text-[#e8e4dc]">{s.title}</td>
                  <td className="py-3 pr-4 text-[#888888]">
                    {formatScreeningInVenue(s.screening_at, locale === 'zh' ? 'zh-CN' : 'en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3 pr-4 text-[#888888]">{stats.count}</td>
                  <td className="py-3 text-[#e8c84a]">
                    {stats.count > 0 ? stats.avg.toFixed(1) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
