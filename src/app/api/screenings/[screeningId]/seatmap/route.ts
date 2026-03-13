import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Returns seatmap data (room, reservations with profiles, waitlist).
 * Profile includes display_name, avatar_config, no_show_count for everyone;
 * wechat_id only when the requesting user is admin (so non-admins never receive it).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ screeningId: string }> }
) {
  const { screeningId } = await params;
  if (!screeningId) {
    return NextResponse.json({ error: 'screeningId required' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    isAdmin = profile?.is_admin === true;
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const [
    { data: screening },
    { data: reservations },
    { data: waitlist },
  ] = await Promise.all([
    admin
      .from('screenings')
      .select('title, squeeze_note, waitlist_mode, rooms(furniture_json, decorations_json, canvas_w, canvas_h)')
      .eq('id', screeningId)
      .single(),
    admin
      .from('reservations')
      .select('id, seat_key, user_id, is_squeezed, is_ghost, ghost_name, ghost_avatar, friend_avatar, attended, created_at, profiles(display_name, avatar_config, wechat_id, no_show_count, attendance_count)')
      .eq('screening_id', screeningId),
    admin
      .from('waitlist')
      .select('id, position, user_id, profiles(display_name, avatar_config)')
      .eq('screening_id', screeningId)
      .eq('status', 'waiting')
      .order('position', { ascending: true }),
  ]);

  if (!screening) {
    return NextResponse.json({ error: 'Screening not found' }, { status: 404 });
  }

  const r = screening.rooms;
  const roomRaw = Array.isArray(r) ? r[0] : r;
  const raw = roomRaw as {
    furniture_json?: unknown;
    decorations_json?: unknown;
    canvas_w?: number;
    canvas_h?: number;
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
      }
    : null;

  type ProfileRow = { display_name: string | null; avatar_config: unknown; wechat_id?: string | null; no_show_count?: number | null; attendance_count?: number | null };
  const reservationList: Array<Record<string, unknown> & { profiles?: ProfileRow | ProfileRow[] | null }> = reservations ?? [];
  const mappedReservations = reservationList.map((row) => {
    const rawProfiles = row.profiles;
    const p = Array.isArray(rawProfiles) ? rawProfiles[0] ?? null : (rawProfiles ?? null);
    const profile = p
      ? {
          display_name: p.display_name ?? null,
          avatar_config: p.avatar_config,
          no_show_count: p.no_show_count ?? 0,
          attendance_count: p.attendance_count ?? 0,
          ...(isAdmin && { wechat_id: p.wechat_id ?? null }),
        }
      : null;
    const { profiles: _drop, ...rest } = row;
    return { ...rest, profiles: profile };
  });

  return NextResponse.json({
    room,
    reservations: mappedReservations,
    waitlist: waitlist ?? [],
    screeningTitle: (screening as { title?: string }).title ?? '',
    squeezeNote: (screening as { squeeze_note?: string | null }).squeeze_note ?? null,
    waitlistMode: ((screening as { waitlist_mode?: string | null }).waitlist_mode as string) ?? 'auto',
  });
}
