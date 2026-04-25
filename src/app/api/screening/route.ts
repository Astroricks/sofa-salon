import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { persistScreeningAltLocale } from '@/lib/persist-screening-alt-locale';
import { hasNonEmptyAltLocaleScreeningFields } from '@/lib/screening-alt-locale-schema';
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
    title_en,
    director_en,
    douban_url,
    letterboxd_url,
    trailer_url,
  } = body;

  if (!title || !screening_at) {
    return NextResponse.json(
      { error: 'title and screening_at required' },
      { status: 400 }
    );
  }

  const insertRow = {
    title,
    description: description ?? '',
    screening_at,
    room_id: room_id ?? null,
    squeeze_note: squeeze_note ?? '',
    waitlist_mode: waitlist_mode ?? 'auto',
    year: year != null ? Number(year) : null,
    director: director ?? '',
    duration_minutes: duration_minutes != null ? Number(duration_minutes) : null,
    douban_url: String(douban_url ?? '').trim(),
    letterboxd_url: String(letterboxd_url ?? '').trim(),
    trailer_url: String(trailer_url ?? '').trim(),
    created_by: user.id,
  };

  const { data, error } = await supabase.from('screenings').insert(insertRow).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const newId = (data as { id: string }).id;
  const alt = await persistScreeningAltLocale(supabase, newId, title_en, director_en);
  if (!alt.ok) {
    if (hasNonEmptyAltLocaleScreeningFields(title_en, director_en)) {
      await supabase.from('screenings').delete().eq('id', newId);
    }
    return NextResponse.json(
      alt.errorKey ? { errorKey: alt.errorKey, error: alt.error } : { error: alt.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ screening: data });
}
