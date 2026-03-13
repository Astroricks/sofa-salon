import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendEventRescheduled } from '@/lib/email';

const TICKER_EXPIRY_DAYS = 3;

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

  const body = await req.json().catch(() => ({}));
  const optionId = body.optionId as string | undefined;
  if (!optionId) {
    return NextResponse.json({ error: 'optionId required' }, { status: 400 });
  }

  const admin = (await import('@/lib/supabase/admin')).createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  const { data: option, error: optErr } = await admin
    .from('reschedule_options')
    .select('id, proposal_id, option_date, time_slot')
    .eq('id', optionId)
    .single();
  if (optErr || !option) {
    return NextResponse.json({ error: 'Option not found' }, { status: 404 });
  }

  const { data: proposal } = await admin
    .from('reschedule_proposals')
    .select('screening_id')
    .eq('id', option.proposal_id)
    .single();
  if (!proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  const startPart = (option.time_slot as string).split(/[–\-]/)[0]?.trim() || '19:00';
  const screeningAt = `${option.option_date}T${startPart}:00.000Z`;

  const { data: screening } = await admin
    .from('screenings')
    .select('id, title, screening_at')
    .eq('id', proposal.screening_id)
    .single();
  if (!screening) {
    return NextResponse.json({ error: 'Screening not found' }, { status: 404 });
  }

  const { error: updateErr } = await admin
    .from('screenings')
    .update({ screening_at: screeningAt })
    .eq('id', proposal.screening_id);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  const screeningTitle = (screening as { title: string }).title ?? '';
  const [{ data: reservations }] = await Promise.all([
    admin.from('reservations').select('user_id').eq('screening_id', proposal.screening_id),
  ]);
  const userIds = new Set<string>();
  for (const r of reservations ?? []) userIds.add((r as { user_id: string }).user_id);
  const emails: string[] = [];
  for (const uid of Array.from(userIds)) {
    try {
      const { data: u } = await admin.auth.admin.getUserById(uid);
      if (u?.user?.email) emails.push(u.user.email);
    } catch {
      // skip
    }
  }
  const screeningAtStr = new Date(screeningAt).toLocaleString();
  for (const email of emails) {
    try {
      await sendEventRescheduled({ to: email, screeningTitle, screeningAt: screeningAtStr });
    } catch {
      // continue
    }
  }
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TICKER_EXPIRY_DAYS);
  await admin.from('ticker_system_events').insert({
    screening_id: proposal.screening_id,
    type: 'rescheduled',
    title: screeningTitle,
    content: screeningTitle,
    expires_at: expiresAt.toISOString(),
  });

  return NextResponse.json({ ok: true, screening_at: screeningAt });
}
