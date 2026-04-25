import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendEventCancelled, sendEventRescheduled } from '@/lib/email';
import { screeningDeleteSkipsCancellationNotify } from '@/lib/screening-delete-policy';
import { persistScreeningAltLocale } from '@/lib/persist-screening-alt-locale';
import { textFieldFromPatchOrPreserve } from '@/lib/patch-body-merge';
const TICKER_EXPIRY_DAYS = 3;

export async function DELETE(
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

  const body = await req.json().catch(() => ({}));
  const confirm = body.confirm === true;

  const { data: screening } = await supabase
    .from('screenings')
    .select('id, title, screening_at')
    .eq('id', id)
    .single();
  if (!screening) {
    return NextResponse.json({ error: 'Screening not found' }, { status: 404 });
  }

  const screeningAt = (screening as { screening_at?: string }).screening_at ?? '';
  const skipCancellationFlow =
    screeningAt !== '' && screeningDeleteSkipsCancellationNotify(screeningAt);

  const [{ data: reservations }, { data: waitlist }] = await Promise.all([
    supabase.from('reservations').select('user_id').eq('screening_id', id),
    supabase.from('waitlist').select('user_id').eq('screening_id', id).eq('status', 'waiting'),
  ]);
  const userIds = new Set<string>();
  for (const r of reservations ?? []) userIds.add((r as { user_id: string }).user_id);
  for (const w of waitlist ?? []) userIds.add((w as { user_id: string }).user_id);
  const totalAffected = userIds.size;

  if (totalAffected > 0 && !confirm) {
    return NextResponse.json({
      hasRegistrations: true,
      count: totalAffected,
      isPastScreening: skipCancellationFlow,
      message: 'Confirm delete to notify all registered users and cancel the event.',
    });
  }

  const admin = (await import('@/lib/supabase/admin')).createAdminClient();
  const emails: string[] = [];
  if (!skipCancellationFlow && admin && userIds.size > 0) {
    for (const uid of Array.from(userIds)) {
      const { data: u } = await admin.auth.admin.getUserById(uid);
      if (u?.user?.email) emails.push(u.user.email);
    }
  }

  if (!skipCancellationFlow) {
    for (const email of emails) {
      try {
        await sendEventCancelled({ to: email, screeningTitle: (screening as { title: string }).title });
      } catch {
        // continue
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TICKER_EXPIRY_DAYS);
    await supabase.from('ticker_system_events').insert({
      screening_id: id,
      type: 'cancelled',
      title: (screening as { title: string }).title,
      content: (screening as { title: string }).title,
      expires_at: expiresAt.toISOString(),
    });
  }

  await supabase.from('waitlist').delete().eq('screening_id', id);
  await supabase.from('reservations').delete().eq('screening_id', id);
  const { error: ratingsDelErr } = await supabase.from('screening_ratings').delete().eq('screening_id', id);
  if (ratingsDelErr && admin) {
    await admin.from('screening_ratings').delete().eq('screening_id', id);
  }
  const { error: delError } = await supabase.from('screenings').delete().eq('id', id);
  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, deleted: true });
}

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

  const { data: existing } = await supabase
    .from('screenings')
    .select('screening_at, title, description, squeeze_note')
    .eq('id', id)
    .single();
  const prev = existing as {
    screening_at?: string;
    title?: string;
    description?: string | null;
    squeeze_note?: string | null;
  } | null;
  const previousAt = prev?.screening_at ? new Date(prev.screening_at).getTime() : null;
  const newAt = new Date(screening_at).getTime();
  const rescheduled = previousAt != null && previousAt !== newAt;

  /** JSON.stringify omits `undefined`; do not wipe DB fields when the client omitted a key. */
  const descriptionNext = textFieldFromPatchOrPreserve(description, prev?.description);
  const squeezeNoteNext = textFieldFromPatchOrPreserve(squeeze_note, prev?.squeeze_note);

  const updates: Record<string, unknown> = {
    title,
    description: descriptionNext,
    screening_at,
    room_id: room_id ?? null,
    squeeze_note: squeezeNoteNext,
    waitlist_mode: waitlist_mode ?? 'auto',
    year: year != null ? Number(year) : null,
    director: director ?? '',
    duration_minutes: duration_minutes != null ? Number(duration_minutes) : null,
    douban_url: String(douban_url ?? '').trim(),
    letterboxd_url: String(letterboxd_url ?? '').trim(),
    trailer_url: String(trailer_url ?? '').trim(),
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

  const alt = await persistScreeningAltLocale(supabase, id, title_en, director_en);
  if (!alt.ok) {
    return NextResponse.json(
      alt.errorKey ? { errorKey: alt.errorKey, error: alt.error } : { error: alt.error },
      { status: 400 }
    );
  }

  if (rescheduled) {
    const screeningTitle = prev?.title ?? title;
    const [{ data: reservations }] = await Promise.all([
      supabase.from('reservations').select('user_id').eq('screening_id', id),
    ]);
    const userIds = new Set<string>();
    for (const r of reservations ?? []) userIds.add((r as { user_id: string }).user_id);
    const admin = (await import('@/lib/supabase/admin')).createAdminClient();
    const emails: string[] = [];
    if (admin && userIds.size > 0) {
      for (const uid of Array.from(userIds)) {
        const { data: u } = await admin.auth.admin.getUserById(uid);
        if (u?.user?.email) emails.push(u.user.email);
      }
    }
    const screeningAtStr = new Date(screening_at).toLocaleString();
    for (const email of emails) {
      try {
        await sendEventRescheduled({ to: email, screeningTitle, screeningAt: screeningAtStr });
      } catch {
        // continue
      }
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TICKER_EXPIRY_DAYS);
    await supabase.from('ticker_system_events').insert({
      screening_id: id,
      type: 'rescheduled',
      title: screeningTitle,
      content: screeningTitle,
      expires_at: expiresAt.toISOString(),
    });
  }

  return NextResponse.json({ screening: data });
}
