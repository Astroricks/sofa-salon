import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_TYPES = [
  'cancel_issue',
  'seat_gone',
  'booking_cancelled',
  'page_broken',
  'cant_select',
  'reschedule_request',
] as const;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const type = body.type as string | undefined;
  const screeningId = body.screeningId as string | undefined;
  const priority = typeof body.priority === 'number' ? body.priority : 2;

  if (!type || !ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  const { error } = await supabase.from('support_logs').insert({
    type,
    screening_id: screeningId || null,
    user_id: user.id,
    priority: priority === 1 ? 1 : 2,
    message: typeof body.message === 'string' ? body.message : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
