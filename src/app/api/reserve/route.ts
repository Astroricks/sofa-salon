/**
 * POST /api/reserve — Claim one or more seats for a screening.
 * Requires: auth, wechat_id in profile. Body: screeningId, seatKey or seatKeys[].
 * On success may send confirmation email (Resend). Enforces RLS and unique (screening_id, seat_key).
 */
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendConfirmation } from '@/lib/email';
import { randomAvatarConfig } from '@/lib/avatar';

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
    .select('display_name, wechat_id')
    .eq('id', user.id)
    .single();

  const wechatId = profile?.wechat_id;
  if (wechatId == null || String(wechatId).trim() === '') {
    return NextResponse.json(
      { error: 'WeChat ID required. Complete profile setup first.' },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { screeningId, seatKey, seatKeys, isSqueezed } = body;
  const keys: string[] = Array.isArray(seatKeys)
    ? seatKeys.filter((k: unknown) => typeof k === 'string')
    : seatKey != null
      ? [String(seatKey)]
      : [];
  if (!screeningId || keys.length === 0) {
    return NextResponse.json(
      { error: 'screeningId and seatKey (or seatKeys array) required' },
      { status: 400 }
    );
  }

  const MAX_SEATS_PER_REQUEST = 10;
  if (keys.length > MAX_SEATS_PER_REQUEST) {
    return NextResponse.json(
      { error: `At most ${MAX_SEATS_PER_REQUEST} seats per request` },
      { status: 400 }
    );
  }

  const { data: screening } = await supabase
    .from('screenings')
    .select('id, title, screening_at, room_id')
    .eq('id', screeningId)
    .single();
  if (!screening) {
    return NextResponse.json({ error: 'Screening not found' }, { status: 404 });
  }

  const [
    { data: existingReservations },
    { count: myExistingCount },
  ] = await Promise.all([
    supabase
      .from('reservations')
      .select('screening_id, seat_key')
      .eq('screening_id', screeningId),
    supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('screening_id', screeningId)
      .eq('user_id', user.id)
      .or('is_ghost.eq(false),is_ghost.is.null'),
  ]);
  const takenSet = new Set((existingReservations ?? []).map((r: { seat_key: string }) => r.seat_key));
  const alreadyTaken = keys.filter((k) => takenSet.has(k));
  if (alreadyTaken.length > 0) {
    return NextResponse.json(
      { error: `Seat(s) already taken: ${alreadyTaken.join(', ')}` },
      { status: 400 }
    );
  }

  const inserted: { id: string; seat_key: string; is_squeezed: boolean }[] = [];
  let seatsAddedInThisRequest = 0;
  for (const sk of keys) {
    const isSqueezedSeat = sk.includes('squeeze');
    const alreadyHadSeatBefore = (myExistingCount ?? 0) >= 1;
    const isSecondOrLaterInThisRequest = seatsAddedInThisRequest >= 1;
    const payload: {
      screening_id: string;
      user_id: string;
      seat_key: string;
      is_squeezed: boolean;
      friend_avatar?: unknown;
    } = {
      screening_id: screeningId,
      user_id: user.id,
      seat_key: sk,
      is_squeezed: isSqueezedSeat,
    };
    if (alreadyHadSeatBefore || isSecondOrLaterInThisRequest) {
      payload.friend_avatar = randomAvatarConfig();
    }
    const { data: row, error } = await supabase
      .from('reservations')
      .insert(payload)
      .select('id, seat_key, is_squeezed')
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    inserted.push(row);
    seatsAddedInThisRequest += 1;
  }

  const email = user.email;
  if (email && inserted.length > 0) {
    try {
      await sendConfirmation({
        to: email,
        screeningTitle: screening.title,
        seatKey: inserted.map((r) => r.seat_key).join(', '),
        displayName: profile?.display_name ?? 'Guest',
        wechatId: String(wechatId),
        screeningAt: new Date(screening.screening_at).toLocaleString(),
      });
    } catch {
      // don't fail the request if email fails
    }
  }

  const ids = inserted.map((r) => r.id);
  const { data: withProfiles } = await supabase
    .from('reservations')
    .select('*, profiles(display_name, avatar_config)')
    .in('id', ids);

  return NextResponse.json({
    reservations: withProfiles ?? inserted,
    reservation: (withProfiles ?? inserted)[0] ?? inserted[0],
  });
}
