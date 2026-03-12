import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { APP_NAME_PARTS } from '@/lib/config';
import { t } from '@/lib/i18n';
import ProfileForm from './ProfileForm';
import WatchHistory from './WatchHistory';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login?redirect=/profile');
  }

  const [profileRes, pastReservationsRes, ratingsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, wechat_id, avatar_config')
      .eq('id', user.id)
      .single(),
    supabase
      .from('reservations')
      .select('screening_id, screenings(id, title, screening_at)')
      .eq('user_id', user.id),
    supabase
      .from('screening_ratings')
      .select('screening_id, rating')
      .eq('user_id', user.id),
  ]);

  const profile = profileRes.data;
  const reservations = pastReservationsRes.data ?? [];
  const ratingsMap = new Map(
    (ratingsRes.data ?? []).map((r: { screening_id: string; rating: number }) => [r.screening_id, r.rating])
  );

  const pastScreenings: { screeningId: string; title: string; screeningAt: string; rating: number | null }[] = [];
  const seen = new Set<string>();
  type ReservationRow = {
    screening_id: string;
    screenings: { id: string; title: string; screening_at: string }[] | { id: string; title: string; screening_at: string } | null;
  };
  for (const r of reservations as ReservationRow[]) {
    const screening = Array.isArray(r.screenings) ? r.screenings[0] : r.screenings;
    if (!screening?.id || seen.has(screening.id)) continue;
    seen.add(screening.id);
    const screeningAt = typeof screening.screening_at === 'string' ? screening.screening_at : '';
    if (new Date(screeningAt).getTime() >= Date.now()) continue;
    pastScreenings.push({
      screeningId: screening.id,
      title: screening.title ?? '',
      screeningAt,
      rating: ratingsMap.get(screening.id) ?? null,
    });
  }
  pastScreenings.sort((a, b) => new Date(b.screeningAt).getTime() - new Date(a.screeningAt).getTime());

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-8 safe-area-inset-bottom">
      <div className="max-w-md mx-auto">
        <h1 className="font-pixel text-xl text-[#e8e4dc] mb-1">
          {APP_NAME_PARTS[0]}{' '}
          <span className="text-[#e8c84a]">{APP_NAME_PARTS.slice(1).join(' ')}</span>
        </h1>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-8">
          {t.profile.title}
        </p>
        <ProfileForm
          initialDisplayName={profile?.display_name ?? ''}
          initialWechatId={profile?.wechat_id ?? ''}
          initialAvatarConfig={profile?.avatar_config ?? {}}
        />
        <WatchHistory items={pastScreenings} />
      </div>
    </div>
  );
}
