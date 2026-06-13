import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import type { FurniturePiece } from '@/lib/furniture';
import { CUSTOMER_SITE_ORIGIN } from '@/lib/config';
import { screeningCapacity } from '@/lib/screening-seat-capacity';

const REGISTRATION_LINK = `${CUSTOMER_SITE_ORIGIN}/`;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  const now = new Date().toISOString();
  const { data: screenings } = await admin
    .from('screenings')
    .select(`
      id,
      title,
      screening_at,
      director,
      duration_minutes,
      description,
      room_id,
      seat_limit,
      waitlist_mode,
      rooms ( furniture_json )
    `)
    .eq('is_active', true)
    .gte('screening_at', now)
    .order('screening_at', { ascending: true })
    .limit(50);

  if (!screenings?.length) {
    return NextResponse.json({
      screenings: [],
      registrationLink: REGISTRATION_LINK,
    });
  }

  const ids = screenings.map((s) => s.id);
  const [reservationsByScreening, waitlistByScreening] = await Promise.all([
    admin.from('reservations').select('screening_id').in('screening_id', ids),
    admin.from('waitlist').select('screening_id').eq('status', 'waiting').in('screening_id', ids),
  ]);

  const reservedCount: Record<string, number> = {};
  for (const r of reservationsByScreening?.data ?? []) {
    const sid = (r as { screening_id: string }).screening_id;
    reservedCount[sid] = (reservedCount[sid] ?? 0) + 1;
  }
  const waitlistCount: Record<string, number> = {};
  for (const w of waitlistByScreening?.data ?? []) {
    const sid = (w as { screening_id: string }).screening_id;
    waitlistCount[sid] = (waitlistCount[sid] ?? 0) + 1;
  }

  const list = screenings.map((s) => {
    const roomsRaw = (s as { rooms?: unknown }).rooms;
    const room = Array.isArray(roomsRaw) ? roomsRaw[0] : roomsRaw;
    const furnitureJson = (room as { furniture_json?: unknown })?.furniture_json;
    const furniture = (Array.isArray(furnitureJson)
      ? furnitureJson
      : []) as FurniturePiece[];
    const capacity = screeningCapacity(
      furniture,
      (s as { seat_limit?: number | null }).seat_limit ?? null
    );
    return {
      id: s.id,
      title: (s as { title: string }).title ?? '',
      screening_at: (s as { screening_at: string }).screening_at,
      director: (s as { director?: string | null }).director ?? '',
      duration_minutes: (s as { duration_minutes?: number | null }).duration_minutes ?? null,
      description: (s as { description?: string | null }).description ?? '',
      reservedCount: reservedCount[s.id] ?? 0,
      capacity,
      waitlistCount: waitlistCount[s.id] ?? 0,
      waitlist_mode: (s as { waitlist_mode?: string }).waitlist_mode ?? 'auto',
    };
  });

  return NextResponse.json({
    screenings: list,
    registrationLink: REGISTRATION_LINK,
  });
}
