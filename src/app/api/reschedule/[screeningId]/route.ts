import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ screeningId: string }> }
) {
  const { screeningId } = await params;
  if (!screeningId) {
    return NextResponse.json({ error: 'Missing screeningId' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { data: proposal } = await supabase
    .from('reschedule_proposals')
    .select('id, screening_id, created_by, created_at')
    .eq('screening_id', screeningId)
    .single();

  if (!proposal) {
    return NextResponse.json({ proposal: null, options: [], optionCount: 0 });
  }

  const { data: options } = await supabase
    .from('reschedule_options')
    .select('id, option_date, time_slot, position')
    .eq('proposal_id', proposal.id)
    .order('position', { ascending: true });

  return NextResponse.json({
    proposal,
    options: options ?? [],
    optionCount: (options ?? []).length,
  });
}
