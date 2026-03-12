import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendWaitlistPromotion } from '@/lib/email';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const body = await req.json();
  const { reservationId } = body;
  if (!reservationId) {
    return NextResponse.json(
      { error: 'reservationId required' },
      { status: 400 }
    );
  }

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id, screening_id, seat_key, user_id')
    .eq('id', reservationId)
    .single();

  if (!reservation || reservation.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found or not your reservation' }, { status: 404 });
  }

  const screeningId = reservation.screening_id;
  const freedSeatKey = reservation.seat_key;

  const { error: delError } = await supabase
    .from('reservations')
    .delete()
    .eq('id', reservationId);

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 400 });
  }

  const { data: screening } = await supabase
    .from('screenings')
    .select('waitlist_mode, title, screening_at')
    .eq('id', screeningId)
    .single();

  if (screening?.waitlist_mode === 'auto') {
    const { data: first } = await supabase
      .from('waitlist')
      .select('id, user_id')
      .eq('screening_id', screeningId)
      .eq('status', 'waiting')
      .order('position', { ascending: true })
      .limit(1)
      .single();

    if (first) {
      const { data: promotedProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', first.user_id)
        .single();

      await supabase.from('reservations').insert({
        screening_id: screeningId,
        user_id: first.user_id,
        seat_key: freedSeatKey,
        is_squeezed: false,
      });

      await supabase
        .from('waitlist')
        .update({ status: 'promoted' })
        .eq('id', first.id);

      await supabase.rpc('reorder_waitlist', {
        p_screening_id: screeningId,
      });

      const admin = (await import('@/lib/supabase/admin')).createAdminClient();
      let email: string | undefined;
      if (admin) {
        const { data: userData } = await admin.auth.admin.getUserById(first.user_id);
        email = userData?.user?.email;
      }
      if (email) {
        try {
          await sendWaitlistPromotion({
            to: email,
            screeningTitle: screening.title,
            seatKey: freedSeatKey,
            screeningAt: new Date(screening.screening_at).toLocaleString(),
          });
        } catch {
          // ignore
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
