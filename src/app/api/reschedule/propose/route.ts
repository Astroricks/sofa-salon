import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const MAX_OPTIONS = 5;
const FIRST_USER_MAX_NEW = 3;
const LATER_USER_MAX_NEW = 2;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const screeningId = body.screeningId as string | undefined;
  const newSlots = body.newSlots as { date: string; timeSlot: string }[] | undefined;
  const voteOptionIds = (body.voteOptionIds as string[] | undefined) ?? [];

  if (!screeningId || typeof screeningId !== 'string') {
    return NextResponse.json({ error: 'screeningId required' }, { status: 400 });
  }

  const validSlots = Array.isArray(newSlots)
    ? newSlots.filter((s) => s && typeof s.date === 'string' && typeof s.timeSlot === 'string' && s.date && s.timeSlot.trim())
    : [];

  const { data: existing } = await supabase
    .from('reschedule_proposals')
    .select('id, created_by')
    .eq('screening_id', screeningId)
    .single();

  if (!existing) {
    if (validSlots.length === 0) {
      return NextResponse.json({ error: 'At least one date+time slot required' }, { status: 400 });
    }
    const toInsert = validSlots.slice(0, FIRST_USER_MAX_NEW);
    const { data: proposal, error: insertProposalError } = await supabase
      .from('reschedule_proposals')
      .insert({ screening_id: screeningId, created_by: user.id })
      .select('id')
      .single();
    if (insertProposalError || !proposal) {
      return NextResponse.json({ error: insertProposalError?.message ?? 'Failed to create proposal' }, { status: 500 });
    }
    for (let i = 0; i < toInsert.length; i++) {
      const { error: optErr } = await supabase.from('reschedule_options').insert({
        proposal_id: proposal.id,
        option_date: toInsert[i].date,
        time_slot: toInsert[i].timeSlot.trim(),
        position: i,
      });
      if (optErr) {
        return NextResponse.json({ error: optErr.message }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true, proposalId: proposal.id });
  }

  const proposalId = existing.id;
  const { count } = await supabase
    .from('reschedule_options')
    .select('id', { count: 'exact', head: true })
    .eq('proposal_id', proposalId);
  const currentCount = count ?? 0;
  const slotsToAdd = Math.min(validSlots.length, Math.max(0, MAX_OPTIONS - currentCount));
  let nextPosition = currentCount;
  for (let i = 0; i < slotsToAdd; i++) {
    const { error: optErr } = await supabase.from('reschedule_options').insert({
      proposal_id: proposalId,
      option_date: validSlots[i].date,
      time_slot: validSlots[i].timeSlot.trim(),
      position: nextPosition++,
    });
    if (optErr) {
      return NextResponse.json({ error: optErr.message }, { status: 500 });
    }
  }

  for (const optionId of voteOptionIds) {
    if (!optionId || typeof optionId !== 'string') continue;
    await supabase.from('reschedule_votes').upsert(
      { user_id: user.id, option_id: optionId },
      { onConflict: 'user_id,option_id' }
    );
  }

  return NextResponse.json({ ok: true, proposalId });
}
