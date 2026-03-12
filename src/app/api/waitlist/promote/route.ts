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
    .select('title, screening_at')
    .eq('id', screeningId)
    .single();

  await supabase.from('reservations').insert({
    screening_id: screeningId,
    user_id: entry.user_id,
    seat_key: seatKey,
    is_squeezed: false,
  });

  await supabase
    .from('waitlist')
    .update({ status: 'promoted' })
    .eq('id', waitlistId);

  await supabase.rpc('reorder_waitlist', {
    p_screening_id: screeningId,
  });

  const admin = (await import('@/lib/supabase/admin')).createAdminClient();
  let email: string | undefined;
  if (admin) {
    const { data: userData } = await admin.auth.admin.getUserById(entry.user_id);
    email = userData?.user?.email;
  }
  if (email && screening) {
    try {
      await sendWaitlistPromotion({
        to: email,
        screeningTitle: screening.title,
        seatKey,
        screeningAt: new Date(screening.screening_at).toLocaleString(),
      });
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ ok: true });
}
