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

/** Admin clears 鸽了 on this screening (Attended or Unset). Drop one blood-bar segment. */
export function shouldUndoNoShowForScreeningUser(
  priorAttendedValues: ReadonlyArray<boolean | null | undefined>,
  newAttended: boolean | null
): boolean {
  if (newAttended === false) return false;
  return priorAttendedValues.some((a) => a === false);
}

/** Per-reservation admin path: undo only if this seat was false and no sibling stays false. */
export function shouldUndoNoShowForReservationRow(
  previousThisRow: boolean | null | undefined,
  newAttended: boolean | null,
  otherSiblingSeatAlreadyFalse: boolean
): boolean {
  if (newAttended === false) return false;
  if (previousThisRow !== false) return false;
  if (otherSiblingSeatAlreadyFalse) return false;
  return true;
}

export function noShowCountAfterUndo(stored: number): number {
  return Math.max(0, Math.min(3, Math.floor(stored)) - 1);
}

type ReservationNoShowRow = {
  screening_id: string;
  attended?: boolean | null;
  is_ghost?: boolean | null;
};

/** Distinct screenings with `attended = false` (non-ghost). Caps at 3 for blood bar. */
export function countNoShowScreeningsFromRows(
  rows: ReadonlyArray<ReservationNoShowRow>
): number {
  const ids = new Set<string>();
  for (const r of rows) {
    if (r.is_ghost === true) continue;
    if (r.attended === false) ids.add(r.screening_id);
  }
  return Math.min(3, ids.size);
}

export async function countNoShowScreeningsForUser(
  client: SupabaseClient,
  userId: string
): Promise<number> {
  const { data, error } = await client
    .from('reservations')
    .select('screening_id, attended, is_ghost')
    .eq('user_id', userId);
  if (error) throw error;
  return countNoShowScreeningsFromRows(data ?? []);
}

/**
 * After admin sets Attended/Unset: blood bar must match reservation rows.
 * Handles orphan `no_show_count` when profile was bumped without `attended=false`.
 */
export function noShowCountAfterClearingAttendance(
  stored: number,
  falseScreeningCount: number,
  shouldDecrementStrike: boolean
): number {
  const fromRows = Math.min(3, Math.max(0, Math.floor(falseScreeningCount)));
  let next = Math.min(3, Math.max(0, Math.floor(stored)));
  if (shouldDecrementStrike) {
    next = noShowCountAfterUndo(next);
  }
  if (next > fromRows) {
    next = fromRows;
  }
  return next;
}

export function noShowCountAfterAdminMark(
  stored: number,
  falseScreeningCount: number
): number {
  return Math.min(3, Math.max(stored, falseScreeningCount));
}

/** Persist blood bar after admin sets Attended or Unset (not 鸽了). */
export async function syncNoShowCountAfterAdminClear(
  client: SupabaseClient,
  userId: string,
  stored: number,
  shouldDecrementStrike: boolean
): Promise<number> {
  const falseScreeningCount = await countNoShowScreeningsForUser(client, userId);
  const next = noShowCountAfterClearingAttendance(
    stored,
    falseScreeningCount,
    shouldDecrementStrike
  );
  if (next !== stored) {
    const { error } = await client
      .from('profiles')
      .update({ no_show_count: next })
      .eq('id', userId);
    if (error) throw error;
  }
  return next;
}

/** Screenings to hide from profile history / receipt (admin marked 鸽了 on any non-ghost seat). */
export function noShowScreeningIds(
  rows: ReadonlyArray<ReservationNoShowRow>
): Set<string> {
  const ids = new Set<string>();
  for (const r of rows) {
    if (r.is_ghost === true) continue;
    if (r.attended === false) ids.add(r.screening_id);
  }
  return ids;
}
