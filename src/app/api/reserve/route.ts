import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendConfirmation } from '@/lib/email';

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
  const { screeningId, seatKey, isSqueezed } = body;
  if (!screeningId || !seatKey) {
    return NextResponse.json(
      { error: 'screeningId and seatKey required' },
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

  const { data: existing } = await supabase
    .from('reservations')
    .select('id')
    .eq('screening_id', screeningId)
    .eq('user_id', user.id)
    .single();
  if (existing) {
    return NextResponse.json(
      { error: 'You already have a seat for this screening' },
      { status: 400 }
    );
  }

  const { data: reservation, error } = await supabase
    .from('reservations')
    .insert({
      screening_id: screeningId,
      user_id: user.id,
      seat_key: seatKey,
      is_squeezed: !!isSqueezed,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const email = user.email;
  if (email) {
    try {
      await sendConfirmation({
        to: email,
        screeningTitle: screening.title,
        seatKey,
        displayName: profile?.display_name ?? 'Guest',
        wechatId: String(wechatId),
        screeningAt: new Date(screening.screening_at).toLocaleString(),
      });
    } catch {
      // don't fail the request if email fails
    }
  }

  const { data: withProfile } = await supabase
    .from('reservations')
    .select('*, profiles(display_name, avatar_config)')
    .eq('id', reservation.id)
    .single();

  return NextResponse.json({
    reservation: withProfile ?? reservation,
  });
}
