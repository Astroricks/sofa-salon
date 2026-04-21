import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/** POST — remove the current user from the screening waitlist (waiting → deleted); reorders positions. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const body = await req.json();
  const { screeningId } = body;
  if (!screeningId) {
    return NextResponse.json({ error: 'screeningId required' }, { status: 400 });
  }

  const { data: entry } = await supabase
    .from('waitlist')
    .select('id')
    .eq('screening_id', screeningId)
    .eq('user_id', user.id)
    .eq('status', 'waiting')
    .maybeSingle();

  if (!entry) {
    return NextResponse.json({ error: 'Not on waitlist' }, { status: 404 });
  }

  const admin = (await import('@/lib/supabase/admin')).createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { error: delErr } = await admin.from('waitlist').delete().eq('id', entry.id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 400 });
  }

  await admin.rpc('reorder_waitlist', {
    p_screening_id: screeningId,
  });

  return NextResponse.json({ ok: true });
}
