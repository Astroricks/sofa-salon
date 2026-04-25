import type { SupabaseClient } from '@supabase/supabase-js';

export type AttendanceCountRow = {
  user_id: string;
  attendance_count: number;
};

/** Normalize PostgREST RPC rows for `get_user_attendance_counts`. */
function normalizeRpcCountRows(data: unknown): AttendanceCountRow[] {
  if (!Array.isArray(data)) return [];
  const rows: AttendanceCountRow[] = [];
  for (const raw of data) {
    if (raw == null || typeof raw !== 'object') continue;
    const o = raw as Record<string, unknown>;
    const uid = o.user_id;
    if (typeof uid !== 'string' || uid === '') continue;
    const c = o.attendance_count;
    const n = typeof c === 'number' ? c : typeof c === 'string' ? Number(c) : Number(c);
    rows.push({ user_id: uid, attendance_count: Number.isFinite(n) ? n : 0 });
  }
  return rows;
}

/**
 * Build a user_id → count map from RPC rows (`user_id`, `attendance_count`).
 * Missing user ids are absent (callers should default to 0).
 */
export function buildAttendanceMap(
  rows: ReadonlyArray<AttendanceCountRow | null | undefined>
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r || typeof r.user_id !== 'string' || r.user_id === '') continue;
    const n = Number(r.attendance_count);
    map.set(r.user_id, Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
  }
  return map;
}

/** Batch badge counts via `get_user_attendance_counts` (SECURITY DEFINER, migration 27). */
export async function fetchAttendanceCounts(
  client: SupabaseClient,
  userIds: ReadonlyArray<string>
): Promise<Map<string, number>> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return new Map();
  const { data, error } = await client.rpc('get_user_attendance_counts', {
    p_user_ids: unique,
  });
  if (error) console.error('[attendance] get_user_attendance_counts:', error.message);
  const rows = normalizeRpcCountRows(data);
  return buildAttendanceMap(rows);
}

/** Single-user badge count via `get_user_attendance_count` (migration 27). */
export async function fetchAttendanceCountForUser(
  client: SupabaseClient,
  userId: string
): Promise<number> {
  if (!userId) return 0;
  const { data, error } = await client.rpc('get_user_attendance_count', {
    p_user_id: userId,
  });
  if (error) console.error('[attendance] get_user_attendance_count:', error.message);
  const n = Number(data ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Admin marks one reservation `attended=false`. Bump `no_show_count` at most once per user per
 * screening: skip if this row was already false (retries), or another seat for the same screening
 * was already marked no-show (multi-seat bookings).
 */
export function shouldApplyNoShowForReservationRow(
  previousThisRow: boolean | null | undefined,
  otherSiblingSeatAlreadyFalse: boolean
): boolean {
  if (previousThisRow === false) return false;
  if (otherSiblingSeatAlreadyFalse) return false;
  return true;
}

/**
 * Admin bulk-sets all reservations for (screening, user) to `attended=false`. Bump at most once per
 * screening: if every row was already false, skip (idempotent replays / retries).
 */
export function shouldApplyNoShowForScreeningUser(
  priorAttendedValues: ReadonlyArray<boolean | null | undefined>
): boolean {
  if (priorAttendedValues.length === 0) return false;
  return !priorAttendedValues.every((a) => a === false);
}
