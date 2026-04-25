import { createClient } from '@/lib/supabase/server';
import { shouldApplyNoShowForScreeningUser } from '@/lib/attendance';
import { NextRequest, NextResponse } from 'next/server';

/** Set attended for all reservations of one user in this screening. One row per user in admin UI. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ screeningId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!adminProfile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { screeningId } = await params;
  const body = await req.json();
  const { userId: targetUserId, attended } = body;
  if (!screeningId || !targetUserId) {
    return NextResponse.json(
      { error: 'screeningId and userId required' },
      { status: 400 }
    );
  }
  if (attended !== true && attended !== false && attended !== null) {
    return NextResponse.json(
      { error: 'attended must be true, false, or null' },
      { status: 400 }
    );
  }

  const { data: priorRows } = await supabase
    .from('reservations')
    .select('attended')
    .eq('screening_id', screeningId)
    .eq('user_id', targetUserId);
  const hadAnyAttendedTrue = priorRows?.some((r) => r.attended === true) ?? false;

  const { error: updateError } = await supabase
    .from('reservations')
    .update({ attended: attended ?? null })
    .eq('screening_id', screeningId)
    .eq('user_id', targetUserId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('no_show_count, consecutive_attendances')
    .eq('id', targetUserId)
    .single();

  const noShow = Number(profile?.no_show_count ?? 0);
  const consecutive = Number(profile?.consecutive_attendances ?? 0);

  if (attended === true) {
    if (hadAnyAttendedTrue) {
      return NextResponse.json({ ok: true });
    }
    const nextConsecutive = consecutive + 1;
    const isPigeon = noShow >= 3;
    const updates: {
      consecutive_attendances: number;
      no_show_count?: number;
    } = {
      consecutive_attendances: isPigeon && nextConsecutive >= 2 ? 0 : nextConsecutive,
    };
    if (isPigeon && nextConsecutive >= 2) {
      updates.no_show_count = 0;
    }
    const { error: profileErr } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', targetUserId);
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }
  } else if (attended === false) {
    const priorValues = (priorRows ?? []).map((r) => r.attended);
    if (!shouldApplyNoShowForScreeningUser(priorValues)) {
      return NextResponse.json({ ok: true });
    }
    const current = Math.min(noShow, 3);
    const next = Math.min(current + 1, 3);
    const updates = {
      consecutive_attendances: 0,
      no_show_count: next,
    };
    const { error: profileErr } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', targetUserId);
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
