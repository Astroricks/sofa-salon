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
import PigeonIcon from '@/components/PigeonIcon';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const locale: Locale = cookieStore.get('sofa-salon-locale')?.value === 'zh' ? 'zh' : 'en';
  const t = getT(locale);

  const [rows, you] = await Promise.all([
    fetchLeaderboard(supabase),
    user ? fetchUserLeaderboardRank(supabase, user.id) : null,
  ]);

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
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-6">
          {t.leaderboard.title}
        </p>

        {you && yourBadge ? (
          <section
            className="mb-6 border border-[#e8c84a] p-4 bg-[#141414]"
            style={{ borderRadius: 0 }}
          >
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-2">
              {t.leaderboard.yourStats}
            </p>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[#e8e4dc]">
              {!you.excludedFromLeaderboard ? (
                <span className="text-[13px]">
                  {t.leaderboard.yourRank.replace('{n}', String(you.rank))}
                </span>
              ) : null}
              <span className="text-[13px] text-[#888888]">
                {t.leaderboard.attendanceCount.replace('{n}', String(you.attendanceCount))}
              </span>
              <span className="text-[13px] inline-flex items-center gap-1">
                <span>{yourBadge.emoji}</span>
                <span>{badgeLabel(yourBadge)}</span>
              </span>
            </div>
          </section>
        ) : (
          <p className="font-mono text-[12px] text-[#666] mb-6">
            {t.leaderboard.signInHint}{' '}
            <Link href="/auth/login?redirect=/leaderboard" className="text-[#e8c84a] hover:underline">
              {t.nav.signIn}
            </Link>
          </p>
        )}

        <section className="border border-[#2a2a2a]" style={{ borderRadius: 0 }}>
          <div className="grid grid-cols-[2.5rem_1fr_auto_auto] gap-2 px-3 py-2 border-b border-[#2a2a2a] font-mono text-[9px] tracking-[0.15em] uppercase text-[#666]">
            <span>#</span>
            <span>{t.leaderboard.guest}</span>
            <span className="text-right">{t.leaderboard.screenings}</span>
            <span className="text-right">{t.leaderboard.badge}</span>
          </div>
          {rows.length === 0 ? (
            <p className="font-mono text-[12px] text-[#666] p-4">{t.leaderboard.empty}</p>
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
                    className={`grid grid-cols-[2.5rem_1fr_auto_auto] gap-2 px-3 py-2.5 items-center font-mono text-[12px] ${
                      isYou ? 'bg-[#1a1a14] text-[#e8e4dc]' : 'text-[#c8c4bc]'
                    }`}
                  >
                    <span className={rank <= 3 ? 'text-[#e8c84a]' : 'text-[#666]'}>{rank}</span>
                    <span className="truncate pr-2" title={row.displayName}>
                      {row.displayName}
                      {isYou ? (
                        <span className="ml-1 text-[#e8c84a] text-[10px]">({t.leaderboard.you})</span>
                      ) : null}
                    </span>
                    <span className="text-right tabular-nums">{row.attendanceCount}</span>
                    <span className="text-right text-base leading-none" title={badgeLabel(badge)}>
                      {isPigeon ? (
                        <PigeonIcon size={18} className="inline-block align-middle" title="Pigeon" />
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
