import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAttendanceCounts } from '@/lib/attendance';
import { fetchScreeningAltLocaleByIds } from '@/lib/screening-alt-locale-fetch';
import type { SeatmapApiPayload } from '@/lib/seatmap-client-cache';

type ProfileRow = {
  display_name: string | null;
  avatar_config: unknown;
  wechat_id?: string | null;
  contact_platform?: string | null;
  contact_id?: string | null;
  no_show_count?: number | null;
};

/** Shared seatmap loader for API route and home SSR (eliminates client round-trip on cold load). */
export async function loadSeatmapPayload(
  admin: SupabaseClient,
  screeningId: string,
  options?: { includeAdminContact?: boolean }
): Promise<SeatmapApiPayload | null> {
  const includeAdminContact = options?.includeAdminContact === true;

  const [
    { data: screening },
    { data: reservations },
    { data: waitlist },
  ] = await Promise.all([
    admin
      .from('screenings')
      .select(
        'title, squeeze_note, waitlist_mode, rooms(furniture_json, decorations_json, canvas_w, canvas_h, room_background_id)'
      )
      .eq('id', screeningId)
      .single(),
    admin
      .from('reservations')
      .select(
        'id, seat_key, user_id, is_squeezed, is_ghost, ghost_name, ghost_avatar, friend_avatar, attended, created_at, profiles(display_name, avatar_config, wechat_id, contact_platform, contact_id, no_show_count)'
      )
      .eq('screening_id', screeningId),
    admin
      .from('waitlist')
      .select('id, position, user_id, profiles(display_name, avatar_config)')
      .eq('screening_id', screeningId)
      .eq('status', 'waiting')
      .order('position', { ascending: true }),
  ]);

  if (!screening) return null;

  const altLocaleById = await fetchScreeningAltLocaleByIds(admin, [screeningId]);

  const r = screening.rooms;
  const roomRaw = Array.isArray(r) ? r[0] : r;
  const raw = roomRaw as {
    furniture_json?: unknown;
    decorations_json?: unknown;
    canvas_w?: number;
    canvas_h?: number;
    room_background_id?: string | null;
  } | undefined;

  const room = raw
    ? {
        furniture: (Array.isArray(raw.furniture_json)
          ? raw.furniture_json
          : JSON.parse(typeof raw.furniture_json === 'string' ? raw.furniture_json : '[]')) as unknown[],
        decorations: (Array.isArray(raw.decorations_json)
          ? raw.decorations_json
          : JSON.parse(typeof raw.decorations_json === 'string' ? raw.decorations_json : '[]')) as unknown[],
        canvasW: raw.canvas_w ?? 600,
        canvasH: raw.canvas_h ?? 400,
        roomBackgroundId: raw.room_background_id ?? 'warm',
      }
    : null;

  const reservationList: Array<
    Record<string, unknown> & { user_id?: string | null; profiles?: ProfileRow | ProfileRow[] | null }
  > = reservations ?? [];
  const userIds = Array.from(
    new Set(
      reservationList
        .map((row) => row.user_id)
        .filter((x): x is string => typeof x === 'string' && x.length > 0)
    )
  );
  const attendanceMap =
    userIds.length > 0 ? await fetchAttendanceCounts(admin, userIds) : new Map<string, number>();

  const mappedReservations = reservationList.map((row) => {
    const rawProfiles = row.profiles;
    const p = Array.isArray(rawProfiles) ? rawProfiles[0] ?? null : rawProfiles ?? null;
    const uid = typeof row.user_id === 'string' ? row.user_id : '';
    const profile = p
      ? {
          display_name: p.display_name ?? null,
          avatar_config: p.avatar_config,
          no_show_count: p.no_show_count ?? 0,
          attendance_count: attendanceMap.get(uid) ?? 0,
          ...(includeAdminContact && {
            wechat_id: p.wechat_id ?? null,
            contact_platform: p.contact_platform ?? 'wechat',
            contact_id: p.contact_id ?? p.wechat_id ?? null,
          }),
        }
      : null;
    const { profiles: _drop, ...rest } = row;
    return { ...rest, profiles: profile };
  });

  const filmTitle = (screening as { title?: string }).title ?? '';
  const filmTitleEn = altLocaleById[screeningId]?.title_en ?? null;

  return {
    room,
    reservations: mappedReservations,
    waitlist: waitlist ?? [],
    filmTitle,
    filmTitleEn,
    screeningTitle: filmTitle,
    squeezeNote: (screening as { squeeze_note?: string | null }).squeeze_note ?? null,
    waitlistMode: ((screening as { waitlist_mode?: string | null }).waitlist_mode as string) ?? 'auto',
  };
}
