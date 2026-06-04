import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const body = await req.json();
  const { screeningId, rating: rawRating } = body;
  if (!screeningId) {
    return NextResponse.json({ error: 'screeningId required' }, { status: 400 });
  }
  const rating = Number(rawRating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be 1–5' }, { status: 400 });
  }

  const { data: screening } = await supabase
    .from('screenings')
    .select('id, screening_at')
    .eq('id', screeningId)
    .single();
  if (!screening) {
    return NextResponse.json({ error: 'Screening not found' }, { status: 404 });
  }

  const screeningAt = new Date((screening as { screening_at: string }).screening_at).getTime();
  if (screeningAt > Date.now()) {
    return NextResponse.json(
      { error: 'You can only rate screenings you have attended (past events)' },
      { status: 400 }
    );
  }

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id')
    .eq('screening_id', screeningId)
    .eq('user_id', user.id)
    .limit(1)
    .single();
  if (!reservation) {
    return NextResponse.json(
      { error: 'You can only rate screenings you attended' },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from('screening_ratings')
    .upsert(
      { user_id: user.id, screening_id: screeningId, rating },
      { onConflict: 'user_id,screening_id' }
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath('/profile');
  revalidatePath('/receipt');
  revalidatePath('/admin/ratings');
  revalidatePath('/', 'layout');

  return NextResponse.json({ ok: true });
}
