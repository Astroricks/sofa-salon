import { cookies } from 'next/headers';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { APP_NAME_PARTS } from '@/lib/config';
import { getBadgeLevel, BADGE_TIERS } from '@/lib/badges';
import { getT, type Locale } from '@/lib/i18n';
import {
  fetchLeaderboard,
  fetchUserLeaderboardRank,
  leaderboardRankAtIndex,
} from '@/lib/leaderboard';
import LeaderboardGuestCell from '@/components/LeaderboardGuestCell';
import AvatarSVG from '@/components/AvatarSVG';
import PigeonIcon from '@/components/PigeonIcon';
import { jsonToConfig } from '@/lib/avatar';

export const dynamic = 'force-dynamic';

const YOUR_AVATAR_SIZE = 36;

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const locale: Locale = cookieStore.get('sofa-salon-locale')?.value === 'zh' ? 'zh' : 'en';
  const t = getT(locale);

  const [rows, you, viewerProfileRes] = await Promise.all([
    fetchLeaderboard(supabase),
    user ? fetchUserLeaderboardRank(supabase, user.id) : null,
    user
      ? supabase
          .from('profiles')
          .select('avatar_config, no_show_count')
          .eq('id', user.id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const viewerProfile = viewerProfileRes.data;
  const viewerIsPigeon = (viewerProfile?.no_show_count ?? 0) >= 3;

  const yourBadge = you ? getBadgeLevel(you.attendanceCount) : null;
  const badgeLabel = (b: { label: string; labelEn: string }) =>
    locale === 'zh' ? b.label : b.labelEn;

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-8 safe-area-inset-bottom">
      <div className="max-w-lg mx-auto">
        <h1 className="font-pixel text-xl text-[#e8e4dc] mb-1">
          {APP_NAME_PARTS[0]}
          <span className="text-[#e8c84a]">{APP_NAME_PARTS.slice(1).join('')}</span>
        </h1>
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#888888] mb-6">
          {t.leaderboard.title}
        </p>

        {you && yourBadge ? (
          <section
            className="mb-6 border border-[#e8c84a] p-4 bg-[#141414]"
            style={{ borderRadius: 0 }}
          >
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#e8c84a] mb-3">
              {t.leaderboard.yourStats}
            </p>
            <div className="flex items-center gap-3 mb-3">
              {viewerIsPigeon ? (
                <PigeonIcon size={YOUR_AVATAR_SIZE} className="flex-shrink-0" title="Pigeon" />
              ) : viewerProfile?.avatar_config ? (
                <AvatarSVG
                  config={jsonToConfig(viewerProfile.avatar_config)}
                  size={YOUR_AVATAR_SIZE}
                  pose="stand"
                />
              ) : (
                <div
                  className="bg-[#1a1a1a] border border-[#2a2a2a] flex-shrink-0"
                  style={{ width: YOUR_AVATAR_SIZE, height: YOUR_AVATAR_SIZE, borderRadius: 0 }}
                  aria-hidden
                />
              )}
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[#e8e4dc] text-[14px]">
                {!you.excludedFromLeaderboard ? (
                  <span>{t.leaderboard.yourRank.replace('{n}', String(you.rank))}</span>
                ) : null}
                <span className="text-[#888888]">
                  {t.leaderboard.attendanceCount.replace('{n}', String(you.attendanceCount))}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-lg leading-none">{yourBadge.emoji}</span>
                  <span>{badgeLabel(yourBadge)}</span>
                </span>
              </div>
            </div>
          </section>
        ) : (
          <p className="font-mono text-[13px] text-[#666] mb-6">
            {t.leaderboard.signInHint}{' '}
            <Link href="/auth/login?redirect=/leaderboard" className="text-[#e8c84a] hover:underline">
              {t.nav.signIn}
            </Link>
          </p>
        )}

        <section className="border border-[#2a2a2a]" style={{ borderRadius: 0 }}>
          <div className="grid grid-cols-[3rem_1fr_auto_auto] gap-3 px-3 py-2.5 border-b border-[#2a2a2a] font-mono text-[10px] tracking-[0.15em] uppercase text-[#666] items-center">
            <span>#</span>
            <span>{t.leaderboard.guest}</span>
            <span className="text-right">{t.leaderboard.screenings}</span>
            <span className="text-right">{t.leaderboard.badge}</span>
          </div>
          {rows.length === 0 ? (
            <p className="font-mono text-[13px] text-[#666] p-4">{t.leaderboard.empty}</p>
          ) : (
            <ol className="divide-y divide-[#2a2a2a]">
              {rows.map((row, index) => {
                const rank = leaderboardRankAtIndex(
                  rows.map((r) => ({ attendance_count: r.attendanceCount })),
                  index
                );
                const isYou = user?.id === row.userId;
                const isPigeon = row.noShowCount >= 3;
                const badge = getBadgeLevel(row.attendanceCount);
                return (
                  <li
                    key={row.userId}
                    className={`grid grid-cols-[3rem_1fr_auto_auto] gap-3 px-3 py-3 items-center ${
                      isYou ? 'bg-[#1a1a14]' : ''
                    }`}
                  >
                    <span
                      className={`font-mono text-[15px] tabular-nums ${
                        rank <= 3 ? 'text-[#e8c84a]' : 'text-[#666]'
                      }`}
                    >
                      {rank}
                    </span>
                    <LeaderboardGuestCell
                      displayName={row.displayName}
                      avatarConfig={row.avatarConfig}
                      isPigeon={isPigeon}
                      isYou={isYou}
                      youLabel={t.leaderboard.you}
                    />
                    <span className="text-right tabular-nums font-mono text-[14px] text-[#c8c4bc]">
                      {row.attendanceCount}
                    </span>
                    <span
                      className="text-right text-xl leading-none"
                      title={badgeLabel(badge)}
                    >
                      {isPigeon ? (
                        <PigeonIcon size={22} className="inline-block align-middle" title="Pigeon" />
                      ) : (
                        badge.emoji
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="mt-8 border border-[#2a2a2a] p-4" style={{ borderRadius: 0 }}>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-3">
            {t.profile.badgeExplanationTitle}
          </p>
          <p className="font-mono text-[11px] text-[#888888] leading-relaxed mb-4">
            {t.profile.badgeExplanation}
          </p>
          <ul className="space-y-1.5">
            {[...BADGE_TIERS].reverse().map((tier) => (
              <li
                key={tier.level}
                className="flex items-center justify-between font-mono text-[11px] text-[#666]"
              >
                <span className="inline-flex items-center gap-2">
                  <span className="text-base">{tier.emoji}</span>
                  <span>{badgeLabel(tier)}</span>
                </span>
                <span className="tabular-nums">
                  {tier.min > 0
                    ? t.leaderboard.tierMin.replace('{n}', String(tier.min))
                    : t.leaderboard.tierSprout}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
