import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendWaitlistPromotion } from '@/lib/email';
import { formatScreeningAtForEmail } from '@/lib/screening-datetime';
import { getScreeningRoomSeatKeys } from '@/lib/admin-screening-reservations';

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
  const { waitlistId, seatKey, screeningId } = body;
  if (!waitlistId || !seatKey || !screeningId) {
    return NextResponse.json(
      { error: 'waitlistId, seatKey, screeningId required' },
      { status: 400 }
    );
  }

  const { data: entry } = await supabase
    .from('waitlist')
    .select('id, user_id')
    .eq('id', waitlistId)
    .eq('screening_id', screeningId)
    .eq('status', 'waiting')
    .single();

  if (!entry) {
    return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 });
  }

  const { data: screening } = await supabase
    .from('screenings')
    .select('id, title, screening_at, duration_minutes')
    .eq('id', screeningId)
    .single();

  const admin = (await import('@/lib/supabase/admin')).createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const roomSeats = await getScreeningRoomSeatKeys(admin, screeningId);
  if (!roomSeats?.seatKeys.includes(seatKey)) {
    return NextResponse.json(
      { error: 'Seat is not available for this screening' },
      { status: 400 }
    );
  }

  const { error: insertError } = await admin.from('reservations').insert({
    screening_id: screeningId,
    user_id: entry.user_id,
    seat_key: seatKey,
    is_squeezed: seatKey.includes('squeeze'),
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  await admin.from('waitlist').update({ status: 'promoted' }).eq('id', waitlistId);

  await admin.rpc('reorder_waitlist', {
    p_screening_id: screeningId,
  });

  let email: string | undefined;
  const { data: userData } = await admin.auth.admin.getUserById(entry.user_id);
  email = userData?.user?.email;
  if (email && screening) {
    try {
      await sendWaitlistPromotion({
        to: email,
        screeningTitle: screening.title,
        seatKey,
        screeningAt: formatScreeningAtForEmail(screening.screening_at),
        calendar: {
          screeningId: screening.id,
          screeningAtIso: new Date(screening.screening_at).toISOString(),
          durationMinutes:
            screening.duration_minutes != null
              ? Number(screening.duration_minutes)
              : null,
        },
      });
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ ok: true });
}
