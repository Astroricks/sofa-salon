import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
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

  const sid = req.nextUrl.searchParams.get('sid');
  if (!sid) {
    return NextResponse.json({ error: 'sid required' }, { status: 400 });
  }

  const { data } = await supabase
    .from('waitlist')
    .select('id, position, user_id, profiles(display_name, wechat_id, avatar_config)')
    .eq('screening_id', sid)
    .eq('status', 'waiting')
    .order('position', { ascending: true });

  return NextResponse.json({ waitlist: data ?? [] });
}
