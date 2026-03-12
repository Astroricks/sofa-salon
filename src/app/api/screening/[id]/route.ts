import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  const {
    title,
    description,
    screening_at,
    room_id,
    squeeze_note,
    waitlist_mode,
    year,
    director,
    duration_minutes,
    is_active,
  } = body;

  if (!title || !screening_at) {
    return NextResponse.json(
      { error: 'title and screening_at required' },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    title,
    description: description ?? '',
    screening_at,
    room_id: room_id ?? null,
    squeeze_note: squeeze_note ?? '',
    waitlist_mode: waitlist_mode ?? 'auto',
    year: year != null ? Number(year) : null,
    director: director ?? '',
    duration_minutes: duration_minutes != null ? Number(duration_minutes) : null,
  };
  if (typeof is_active === 'boolean') updates.is_active = is_active;

  const { data, error } = await supabase
    .from('screenings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ screening: data });
}
