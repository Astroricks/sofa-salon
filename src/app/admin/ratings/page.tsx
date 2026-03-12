import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { APP_NAME_PARTS } from '@/lib/config';
import { t } from '@/lib/i18n';

export default async function AdminRatingsPage() {
  const supabase = await createClient();
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
    .select('id, title, screening_at')
    .lt('screening_at', now)
    .order('screening_at', { ascending: false })
    .limit(50);

  const ids = (pastScreenings ?? []).map((s) => s.id);
  const ratingStats: Record<string, { count: number; avg: number }> = {};
  if (ids.length > 0) {
    const { data: ratings } = await supabase
      .from('screening_ratings')
      .select('screening_id, rating')
      .in('screening_id', ids);
    const byScreening: Record<string, number[]> = {};
    for (const r of ratings ?? []) {
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
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 bg-[#0f0f0f]">
      <Link
        href="/admin"
        className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] hover:text-[#e8c84a] mb-6 inline-block transition-colors"
      >
        {t.admin.backToAdmin}
      </Link>
      <h1 className="font-pixel text-xl text-[#e8e4dc] mb-1">
        {APP_NAME_PARTS[0]} <span className="text-[#e8c84a]">Admin</span>
      </h1>
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-6">
        {t.admin.ratingsReport}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full font-mono text-[13px] border-collapse">
          <thead>
            <tr className="text-left border-b border-[#2a2a2a]">
              <th className="py-3 pr-4 text-[#e8c84a] uppercase tracking-wider">{t.admin.pastScreenings}</th>
              <th className="py-3 pr-4 text-[#888888] uppercase tracking-wider">Date</th>
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
                    {new Date(s.screening_at).toLocaleDateString('en-GB', {
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
