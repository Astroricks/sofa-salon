import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAttendanceCountForUser } from '@/lib/attendance';
import { isLeaderboardHostDisplayName } from '@/lib/config';

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
  /** Guests with at least one counted screening (excludes salon host). */
  totalRegisteredGuests: number;
  /** True for salon host only: rank 0 in standing; omitted from the table below. */
  excludedFromLeaderboard: boolean;
};

/** 1-based rank vs other guests' attendance (salon host is not in `eligible`). */
export function rankAmongEligibleGuests(
  attendanceCount: number,
  eligible: ReadonlyArray<CountRow>
): number {
  if (attendanceCount <= 0) {
    return eligible.filter((c) => c.attendance_count > 0).length + 1;
  }
  return eligible.filter((c) => c.attendance_count > attendanceCount).length + 1;
}

/** Guests in `eligible` with at least one past screening counted toward badges. */
export function guestsWithAttendanceCount(eligible: ReadonlyArray<CountRow>): number {
  return eligible.filter((c) => c.attendance_count > 0).length;
}

/** Guests who have attended ≥1 screening (same pool as ranking; excludes salon host). */
export async function fetchRegisteredGuestCount(client: SupabaseClient): Promise<number> {
  const eligible = await fetchEligibleLeaderboardCounts(client);
  return guestsWithAttendanceCount(eligible);
}

/** Primary host(s) excluded from public leaderboard (not all `is_admin` accounts). */
export async function fetchLeaderboardExcludedUserIds(
  client: SupabaseClient
): Promise<Set<string>> {
  const { data, error } = await client.from('profiles').select('id, display_name');
  if (error) {
    console.error('[leaderboard] host profiles:', error.message);
    return new Set();
  }
  return new Set(
    (data ?? [])
      .filter((p) => isLeaderboardHostDisplayName(p.display_name as string | null))
      .map((p) => p.id as string)
  );
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

/** Sorted attendance rows excluding salon host(s); co-admins still included. */
export async function fetchEligibleLeaderboardCounts(
  client: SupabaseClient
): Promise<CountRow[]> {
  const hostIds = await fetchLeaderboardExcludedUserIds(client);
  const { data: counts, error } = await client
    .from('user_attendance_counts')
    .select('user_id, attendance_count')
    .order('attendance_count', { ascending: false });

  if (error) {
    console.error('[leaderboard] user_attendance_counts:', error.message);
    return [];
  }

  return (counts ?? [])
    .filter((c) => !hostIds.has(c.user_id as string))
    .map((c) => ({
      user_id: c.user_id as string,
      attendance_count: Number(c.attendance_count),
    }));
}

/** Top guests by badge attendance count (migration 26 view), excluding salon host(s). */
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

/** Standing for viewer; salon host gets rank 0, co-admins compete normally. */
export async function fetchUserLeaderboardRank(
  client: SupabaseClient,
  userId: string
): Promise<UserLeaderboardStanding> {
  const hostIds = await fetchLeaderboardExcludedUserIds(client);
  const [attendanceCount, eligible] = await Promise.all([
    fetchAttendanceCountForUser(client, userId),
    fetchEligibleLeaderboardCounts(client),
  ]);
  const totalRegisteredGuests = guestsWithAttendanceCount(eligible);

  if (hostIds.has(userId)) {
    return {
      rank: 0,
      attendanceCount,
      totalRegisteredGuests,
      excludedFromLeaderboard: true,
    };
  }

  const rank = rankAmongEligibleGuests(attendanceCount, eligible);

  return {
    rank,
    attendanceCount,
    totalRegisteredGuests,
    excludedFromLeaderboard: false,
  };
}
