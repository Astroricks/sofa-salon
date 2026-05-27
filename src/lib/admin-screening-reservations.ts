import type { SupabaseClient } from '@supabase/supabase-js';
import { catalogSeatKeyForUser } from '@/lib/historical-catalog';
import { getProfileContact, type ProfileContactRow } from '@/lib/contact-platform';
import {
  getSeatPositions,
  getSqueezePositions,
  type FurniturePiece,
} from '@/lib/furniture';
import { isScreeningPast } from '@/lib/screening-datetime';

export type ProfileMatch = {
  id: string;
  display_name: string;
  contact_platform: string | null;
  contact_id: string | null;
  wechat_id: string | null;
};

/** Trim for display_name lookup (names are not unique in the DB). */
export function normalizeDisplayNameQuery(query: string): string {
  return query.trim();
}

/** Case-insensitive exact match on display_name. */
export async function findProfilesByDisplayName(
  db: SupabaseClient,
  displayName: string
): Promise<ProfileMatch[]> {
  const q = normalizeDisplayNameQuery(displayName);
  if (!q) return [];
  const { data, error } = await db
    .from('profiles')
    .select('id, display_name, contact_platform, contact_id, wechat_id')
    .ilike('display_name', q);
  if (error) throw error;
  const lower = q.toLowerCase();
  return (data ?? []).filter(
    (p) => (p.display_name ?? '').trim().toLowerCase() === lower
  ) as ProfileMatch[];
}

/** Tie-breaker label for duplicate display names (includes platform when not WeChat). */
export function profileMatchContactLine(
  row: ProfileContactRow,
  labels: Record<'wechat' | 'whatsapp' | 'instagram' | 'discord', string>
): string {
  const { platform, id } = getProfileContact(row);
  if (!id) return '—';
  if (platform === 'wechat') return id;
  return `${labels[platform]}: ${id}`;
}

/** Prefer regular seats; first key in room order. */
export function pickAvailableSeatKey(
  allSeatKeys: string[],
  takenSeatKeys: Set<string>
): string | null {
  const available = allSeatKeys.filter((k) => !takenSeatKeys.has(k));
  const regular = available.filter((k) => !k.includes('squeeze'));
  if (regular.length > 0) return regular[0];
  return available[0] ?? null;
}

/**
 * Seat for admin-added reservation: physical seat when room has seats and event is upcoming;
 * otherwise catalog seat (past screenings / sheet catalog rows without a room).
 */
export function pickSeatKeyForAdminAdd(opts: {
  userId: string;
  screeningAt: string;
  roomSeatKeys: string[];
  takenSeatKeys: Set<string>;
}): { seatKey: string; isCatalog: boolean } | null {
  const past = isScreeningPast(opts.screeningAt);
  if (!past && opts.roomSeatKeys.length > 0) {
    const physical = pickAvailableSeatKey(opts.roomSeatKeys, opts.takenSeatKeys);
    if (physical) return { seatKey: physical, isCatalog: false };
    return null;
  }
  return { seatKey: catalogSeatKeyForUser(opts.userId), isCatalog: true };
}

export async function getScreeningRoomSeatKeys(
  db: SupabaseClient,
  screeningId: string
): Promise<{ seatKeys: string[]; roomId: string } | null> {
  const { data: screening } = await db
    .from('screenings')
    .select('room_id')
    .eq('id', screeningId)
    .single();
  if (!screening?.room_id) return null;
  const { data: room } = await db
    .from('rooms')
    .select('furniture_json')
    .eq('id', screening.room_id)
    .single();
  const furniture = (room?.furniture_json as FurniturePiece[]) ?? [];
  const seatKeys = furniture.flatMap((p) => [
    ...getSeatPositions(p).map((s) => s.seatKey),
    ...getSqueezePositions(p).map((s) => s.seatKey),
  ]);
  return { seatKeys, roomId: screening.room_id };
}

export async function getUserEmail(
  admin: SupabaseClient,
  userId: string
): Promise<string | undefined> {
  const { data: u } = await admin.auth.admin.getUserById(userId);
  return u?.user?.email ?? undefined;
}
