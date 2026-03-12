import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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
    .select('wechat_id')
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
  const { screeningId } = body;
  if (!screeningId) {
    return NextResponse.json(
      { error: 'screeningId required' },
      { status: 400 }
    );
  }

  const { count } = await supabase
    .from('waitlist')
    .select('*', { count: 'exact', head: true })
    .eq('screening_id', screeningId)
    .eq('status', 'waiting');

  const position = (count ?? 0) + 1;

  const { data, error } = await supabase
    .from('waitlist')
    .insert({
      screening_id: screeningId,
      user_id: user.id,
      position,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ waitlistEntry: data });
}
