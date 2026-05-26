import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { APP_NAME_PARTS } from '@/lib/config';
import { getT, type Locale } from '@/lib/i18n';
import { getBadgeLevel } from '@/lib/badges';
import { jsonToConfig } from '@/lib/avatar';
import AvatarSVG from '@/components/AvatarSVG';
import BloodBar from '@/components/BloodBar';
import PigeonIcon from '@/components/PigeonIcon';
import ProfileForm from './ProfileForm';
import BadgeWithPopup from './BadgeWithPopup';
import TickerUserSubmit from '@/components/TickerUserSubmit';
import WatchHistory from './WatchHistory';
import { fetchAttendanceCountForUser, noShowScreeningIds } from '@/lib/attendance';

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
      .select('display_name, wechat_id, contact_platform, contact_id, avatar_config, no_show_count')
      .eq('id', user.id)
      .single(),
    supabase
      .from('reservations')
      .select('screening_id, seat_key, is_squeezed, attended, is_ghost, screenings(id, title, screening_at, duration_minutes)')
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

  type ReservationRow = {
    screening_id: string;
    seat_key?: string;
    is_squeezed?: boolean;
    attended?: boolean | null;
    is_ghost?: boolean | null;
    screenings: { id: string; title: string; screening_at: string; duration_minutes?: number | null }[] | { id: string; title: string; screening_at: string; duration_minutes?: number | null } | null;
  };
  const now = Date.now();
  const upcomingByScreening = new Map<string, { title: string; screeningAt: string; seatCount: number }>();
  const pastScreenings: {
    screeningId: string;
    title: string;
    screeningAt: string;
    rating: number | null;
    durationMinutes: number | null;
  }[] = [];
  const seenPast = new Set<string>();
  const hiddenNoShowIds = noShowScreeningIds(reservations as ReservationRow[]);

  for (const r of reservations as ReservationRow[]) {
    const screening = Array.isArray(r.screenings) ? r.screenings[0] : r.screenings;
    if (!screening?.id) continue;
    if (r.is_ghost === true) continue;
    const screeningAt = typeof screening.screening_at === 'string' ? screening.screening_at : '';
    const ts = new Date(screeningAt).getTime();
    if (ts >= now) {
      const cur = upcomingByScreening.get(screening.id);
      if (!cur) {
        upcomingByScreening.set(screening.id, {
          title: screening.title ?? '',
          screeningAt,
          seatCount: 1,
        });
      } else {
        cur.seatCount += 1;
      }
    } else {
      if (hiddenNoShowIds.has(screening.id)) continue;
      if (seenPast.has(screening.id)) continue;
      seenPast.add(screening.id);
      pastScreenings.push({
        screeningId: screening.id,
        title: screening.title ?? '',
        screeningAt,
        rating: ratingsMap.get(screening.id) ?? null,
        durationMinutes: screening.duration_minutes ?? null,
      });
    }
  }
  const badgeAttendanceCount = await fetchAttendanceCountForUser(supabase, user.id);
  pastScreenings.sort((a, b) => new Date(b.screeningAt).getTime() - new Date(a.screeningAt).getTime());
  const upcomingReservations = Array.from(upcomingByScreening.entries())
    .map(([screeningId, { title, screeningAt, seatCount }]) => ({ screeningId, title, screeningAt, seatCount }))
    .sort((a, b) => new Date(a.screeningAt).getTime() - new Date(b.screeningAt).getTime());

  const cookieStore = await cookies();
  const locale: Locale = cookieStore.get('sofa-salon-locale')?.value === 'zh' ? 'zh' : 'en';
  const t = getT(locale);

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-8 safe-area-inset-bottom">
      <div className="max-w-md mx-auto">
        <h1 className="font-pixel text-xl text-[#e8e4dc] mb-1">
          {APP_NAME_PARTS[0]}
          <span className="text-[#e8c84a]">{APP_NAME_PARTS.slice(1).join('')}</span>
        </h1>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-4">
          {t.profile.title}
        </p>
        {/* Blood bar above avatar, then avatar (形象) — smaller scale */}
        <div className="flex flex-col items-center mb-8">
          <BloodBar
            noShowCount={profile?.no_show_count ?? 0}
            className="mb-1.5"
            ariaLabel={t.profile.bloodBar}
          />
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-1 block">
            {t.profile.bloodBar}
          </span>
          {(profile?.no_show_count ?? 0) >= 3 ? (
            <PigeonIcon size={140} className="flex-shrink-0" title="Pigeon" />
          ) : (
            <AvatarSVG
              config={jsonToConfig(profile?.avatar_config ?? {})}
              size={56}
              pose="stand"
            />
          )}
          <div className="flex items-center gap-2 mt-1.5 font-mono text-[12px] text-[#888888]">
            {(() => {
              const badge = getBadgeLevel(badgeAttendanceCount);
              return (
                <BadgeWithPopup
                  badge={{ emoji: badge.emoji, label: badge.label, labelEn: badge.labelEn }}
                  locale={locale}
                  explanationTitle={t.profile.badgeExplanationTitle}
                  explanation={t.profile.badgeExplanation}
                />
              );
            })()}
          </div>
          <p className="mt-3 text-[#666] font-mono text-[11px] leading-relaxed max-w-sm text-center">
            {t.profile.bloodBarExplanationBefore}
            <span className="inline-flex items-center align-middle gap-0.5">
              <PigeonIcon size={14} className="inline-block align-middle shrink-0" title="Pigeon" />
              <span>{t.profile.bloodBarExplanationPigeon}</span>
            </span>
            {t.profile.bloodBarExplanationAfter}
          </p>
        </div>
        <ProfileForm
          initialDisplayName={profile?.display_name ?? ''}
          initialContactPlatform={profile?.contact_platform ?? 'wechat'}
          initialContactId={profile?.contact_id ?? ''}
          initialWechatId={profile?.wechat_id ?? ''}
          initialAvatarConfig={profile?.avatar_config ?? {}}
        />
        <section className="mt-8 border border-[#2a2a2a] p-4" style={{ borderRadius: 0 }}>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-3">
            {t.profile.myReservations}
          </p>
          {upcomingReservations.length === 0 ? (
            <p className="font-mono text-[12px] text-[#666]">{t.profile.myReservationsEmpty}</p>
          ) : (
            <ul className="space-y-3">
              {upcomingReservations.map(({ screeningId, title, screeningAt, seatCount }) => {
                const d = new Date(screeningAt);
                const dateStr = d.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-GB', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const timeStr = d.toLocaleTimeString(locale === 'zh' ? 'zh-CN' : 'en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <li key={screeningId} className="border-b border-[#2a2a2a] pb-3 last:border-0 last:pb-0">
                    <p className="font-mono text-[13px] text-[#e8e4dc]">{title}</p>
                    <p className="font-mono text-[11px] text-[#888888] mt-0.5">
                      {dateStr} · {timeStr}
                    </p>
                    <p className="font-mono text-[11px] text-[#666] mt-0.5">
                      {t.profile.seatCount.replace('{n}', String(seatCount))}
                    </p>
                    <a
                      href={`/screening/${screeningId}`}
                      className="inline-block mt-2 font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] hover:underline"
                    >
                      {t.profile.goToScreening} →
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="mt-8 border border-[#e8c84a]/30 bg-[#141414] p-5 rounded-sm shadow-[0_0_0_1px_rgba(232,200,74,0.1)]">
          <p className="font-mono text-[11px] tracking-wider uppercase text-[#e8c84a] mb-3 font-medium">
            {t.profile.sendToTicker}
          </p>
          <p className="font-mono text-[11px] text-[#888888] mb-3">
            {locale === 'zh' ? '你的话会出现在首页顶部弹幕里，大家都能看到。' : 'Your message will appear on the homepage ticker for everyone to see.'}
          </p>
          <TickerUserSubmit
            labels={{
              placeholder: t.profile.sendToTickerPlaceholder,
              sendButton: t.profile.sendToTickerButton,
              sentButton: t.profile.sendToTickerSent,
            }}
          />
        </section>
        <WatchHistory items={pastScreenings} />
      </div>
    </div>
  );
}
