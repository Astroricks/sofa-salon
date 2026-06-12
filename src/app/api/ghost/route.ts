// Ghost seats are a social proof tool for small private events.
// The host uses this to prevent the "everyone waits for everyone else" problem.
// Guests are friends of the host who trust him to run a good event — this is
// closer to "I'm saving a seat for someone" than deception.

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { randomAvatarConfig } from '@/lib/avatar';
import type { FurniturePiece } from '@/lib/furniture';
import { reservableSeatKeys } from '@/lib/screening-seat-capacity';

const GHOST_NAMES = [
  'Alex',
  'Sam',
  'Jordan',
  'Casey',
  'Riley',
  'Morgan',
  'Taylor',
  'Jamie',
  'Avery',
  'Quinn',
  'Skyler',
  'Drew',
  '小明',
  '小红',
  '小华',
  '晓晓',
  '阿杰',
  '小鱼',
];

const MAX_GHOSTS_PER_SCREENING = 3;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { screeningId } = body;
  if (!screeningId) {
    return NextResponse.json(
      { error: 'screeningId required' },
      { status: 400 }
    );
  }

  const { data: screening } = await supabase
    .from('screenings')
    .select('id, room_id, seat_limit')
    .eq('id', screeningId)
    .single();
  if (!screening?.room_id) {
    return NextResponse.json(
      { error: 'Screening or room not found' },
      { status: 404 }
    );
  }

  const { data: room } = await supabase
    .from('rooms')
    .select('furniture_json')
    .eq('id', screening.room_id)
    .single();
  const furniture = (room?.furniture_json as FurniturePiece[]) ?? [];

  const allSeatKeys = reservableSeatKeys(
    furniture,
    (screening as { seat_limit?: number | null }).seat_limit ?? null
  );
  if (allSeatKeys.length === 0) {
    return NextResponse.json(
      { error: 'Room has no seats' },
      { status: 400 }
    );
  }

  const { data: existingReservations } = await supabase
    .from('reservations')
    .select('seat_key, is_ghost, ghost_name, profiles(display_name)')
    .eq('screening_id', screeningId);

  type ResRow = {
    seat_key: string;
    is_ghost?: boolean;
    ghost_name?: string | null;
    profiles?: { display_name?: string } | null;
  };
  const rows = (existingReservations ?? []) as ResRow[];
  const currentGhostCount = rows.filter((r) => r.is_ghost === true).length;
  if (currentGhostCount >= MAX_GHOSTS_PER_SCREENING) {
    return NextResponse.json(
      { error: `Maximum ${MAX_GHOSTS_PER_SCREENING} ghosts per screening` },
      { status: 400 }
    );
  }

  const takenSeatKeys = new Set(rows.map((r) => r.seat_key));
  const existingNames = new Set(
    rows.map((r) => r.ghost_name ?? r.profiles?.display_name ?? '')
  );
  const availableSeatKeys = allSeatKeys.filter((k) => !takenSeatKeys.has(k));
  if (availableSeatKeys.length === 0) {
    return NextResponse.json(
      { error: 'No available seats' },
      { status: 400 }
    );
  }

  const seatKey =
    availableSeatKeys[Math.floor(Math.random() * availableSeatKeys.length)];
  const isSqueezed = seatKey.includes('squeeze');

  let ghostName = GHOST_NAMES[Math.floor(Math.random() * GHOST_NAMES.length)];
  for (let i = 0; i < GHOST_NAMES.length * 2; i++) {
    if (!existingNames.has(ghostName)) break;
    ghostName = GHOST_NAMES[Math.floor(Math.random() * GHOST_NAMES.length)];
  }

  const ghostAvatar = randomAvatarConfig();

  const { data: reservation, error } = await supabase
    .from('reservations')
    .insert({
      screening_id: screeningId,
      seat_key: seatKey,
      user_id: user.id,
      is_squeezed: isSqueezed,
      is_ghost: true,
      ghost_name: ghostName,
      ghost_avatar: ghostAvatar,
    })
    .select('id, seat_key, is_squeezed, is_ghost, ghost_name, ghost_avatar')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({
    reservation: {
      ...reservation,
      user_id: user.id,
      profiles: null,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { screeningId, seatKey } = body;
  if (!screeningId || !seatKey) {
    return NextResponse.json(
      { error: 'screeningId and seatKey required' },
      { status: 400 }
    );
  }

  const admin = (await import('@/lib/supabase/admin')).createAdminClient();
  const client = admin ?? supabase;

  const { error } = await client
    .from('reservations')
    .delete()
    .eq('screening_id', screeningId)
    .eq('seat_key', seatKey)
    .eq('is_ghost', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

/** Admin-only: rename a ghost (ghost_name). Use service-role so RLS does not block the update. */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { screeningId, seatKey, ghost_name } = body;
  if (!screeningId || !seatKey) {
    return NextResponse.json(
      { error: 'screeningId and seatKey required' },
      { status: 400 }
    );
  }

  const updatePayload: { ghost_name: string | null } = {
    ghost_name: typeof ghost_name === 'string' ? ghost_name.trim() || null : null,
  };

  const admin = (await import('@/lib/supabase/admin')).createAdminClient();
  const client = admin ?? supabase;

  const { data: rows, error } = await client
    .from('reservations')
    .update(updatePayload)
    .eq('screening_id', screeningId)
    .eq('seat_key', seatKey)
    .eq('is_ghost', true)
    .select('id, ghost_name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!rows?.length) {
    return NextResponse.json({ error: 'Ghost reservation not found' }, { status: 404 });
  }
  const row = rows[0];
  return NextResponse.json({ ok: true, ghost_name: row.ghost_name });
}
