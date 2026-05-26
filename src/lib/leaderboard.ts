import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAttendanceCountForUser } from '@/lib/attendance';

export const LEADERBOARD_TOP_N = 10;

export type LeaderboardRow = {
  userId: string;
  displayName: string;
  attendanceCount: number;
  noShowCount: number;
  avatarConfig: unknown;
};

export type UserLeaderboardStanding = {
  rank: number;
  attendanceCount: number;
  /** True when viewer is admin (e.g. host); not ranked on the public board. */
  excludedFromLeaderboard: boolean;
};

async function fetchAdminUserIds(client: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await client.from('profiles').select('id').eq('is_admin', true);
  if (error) {
    console.error('[leaderboard] admin profiles:', error.message);
    return new Set();
  }
  return new Set((data ?? []).map((p) => p.id as string));
}

type CountRow = { user_id: string; attendance_count: number };

/**
 * At least `minPlaces` rows; if the cutoff place is tied, include everyone with that count.
 * Example: 10th guest has 4 screenings → show all guests with 4+ (may be more than 10 rows).
 */
export function selectLeaderboardCutoff(
  sortedEligible: ReadonlyArray<CountRow>,
  minPlaces = LEADERBOARD_TOP_N
): CountRow[] {
  if (sortedEligible.length <= minPlaces) {
    return [...sortedEligible];
  }
  const cutoffCount = sortedEligible[minPlaces - 1].attendance_count;
  return sortedEligible.filter((c) => c.attendance_count >= cutoffCount);
}

/** 1-based rank with ties (two guests at 4 screenings both show rank 10 if nine are ahead). */
export function leaderboardRankAtIndex(
  rows: ReadonlyArray<{ attendance_count: number }>,
  index: number
): number {
  const count = rows[index]?.attendance_count ?? 0;
  let rank = 1;
  for (const row of rows) {
    if (row.attendance_count > count) rank += 1;
  }
  return rank;
}

/** Sorted attendance rows excluding admins (host accounts). */
export async function fetchEligibleLeaderboardCounts(
  client: SupabaseClient
): Promise<CountRow[]> {
  const adminIds = await fetchAdminUserIds(client);
  const { data: counts, error } = await client
    .from('user_attendance_counts')
    .select('user_id, attendance_count')
    .order('attendance_count', { ascending: false });

  if (error) {
    console.error('[leaderboard] user_attendance_counts:', error.message);
    return [];
  }

  return (counts ?? [])
    .filter((c) => !adminIds.has(c.user_id as string))
    .map((c) => ({
      user_id: c.user_id as string,
      attendance_count: Number(c.attendance_count),
    }));
}

/** Top guests by badge attendance count (migration 26 view), excluding admins. */
export async function fetchLeaderboard(
  client: SupabaseClient,
  minPlaces = LEADERBOARD_TOP_N
): Promise<LeaderboardRow[]> {
  const eligible = await fetchEligibleLeaderboardCounts(client);
  const top = selectLeaderboardCutoff(eligible, minPlaces);
  if (!top.length) return [];

  const userIds = top.map((c) => c.user_id);
  const { data: profiles, error: profileError } = await client
    .from('profiles')
    .select('id, display_name, no_show_count, avatar_config')
    .in('id', userIds);

  if (profileError) {
    console.error('[leaderboard] profiles:', profileError.message);
  }

  const profileById = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      {
        displayName: (p.display_name as string | null) ?? '—',
        noShowCount: Number(p.no_show_count ?? 0),
        avatarConfig: p.avatar_config,
      },
    ])
  );

  return top.map((c) => {
    const profile = profileById.get(c.user_id);
    const n = c.attendance_count;
    return {
      userId: c.user_id,
      displayName: profile?.displayName ?? '—',
      attendanceCount: Number.isFinite(n) && n > 0 ? Math.floor(n) : 0,
      noShowCount: profile?.noShowCount ?? 0,
      avatarConfig: profile?.avatarConfig ?? null,
    };
  });
}

/** 1-based rank among non-admin guests; admins are not ranked. */
export async function fetchUserLeaderboardRank(
  client: SupabaseClient,
  userId: string
): Promise<UserLeaderboardStanding> {
  const adminIds = await fetchAdminUserIds(client);
  const attendanceCount = await fetchAttendanceCountForUser(client, userId);

  if (adminIds.has(userId)) {
    return { rank: 0, attendanceCount, excludedFromLeaderboard: true };
  }

  const eligible = await fetchEligibleLeaderboardCounts(client);

  if (attendanceCount <= 0) {
    const withPositive = eligible.filter((c) => c.attendance_count > 0).length;
    return {
      rank: withPositive + 1,
      attendanceCount: 0,
      excludedFromLeaderboard: false,
    };
  }

  const higher = eligible.filter((c) => c.attendance_count > attendanceCount).length;
  return {
    rank: higher + 1,
    attendanceCount,
    excludedFromLeaderboard: false,
  };
}
