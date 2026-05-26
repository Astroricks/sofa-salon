import { createClient } from '@/lib/supabase/server';
import { getAdminWriteClient, reservationsUpdateHint } from '@/lib/admin-db';
import {
  countNoShowScreeningsForUser,
  noShowCountAfterAdminMark,
  parseAdminAttendanceBody,
  presentAttendanceValue,
  profileUpdatesAfterConsecutiveAttendance,
  reservationIsPresent,
  shouldApplyNoShowForScreeningUser,
  shouldIncrementConsecutiveAttendance,
  shouldUndoNoShowForScreeningUser,
  syncNoShowCountAfterAdminClear,
} from '@/lib/attendance';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Set no-show for all reservations of one user in this screening.
 * Present (default) = `attended` null; no-show = `attended` false.
 */
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
  const { userId: targetUserId } = body;
  if (!screeningId || !targetUserId) {
    return NextResponse.json(
      { error: 'screeningId and userId required' },
      { status: 400 }
    );
  }

  const parsed = parseAdminAttendanceBody(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const attended = parsed.value;

  const admin = getAdminWriteClient();
  const db = admin ?? supabase;

  const { data: priorRows } = await db
    .from('reservations')
    .select('attended')
    .eq('screening_id', screeningId)
    .eq('user_id', targetUserId);
  const priorValues = (priorRows ?? []).map((r) => r.attended);

  const { data: updatedRows, error: updateError } = await db
    .from('reservations')
    .update({
      attended: attended === false ? false : presentAttendanceValue(),
    })
    .eq('screening_id', screeningId)
    .eq('user_id', targetUserId)
    .select('id');

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }
  if (!updatedRows?.length) {
    return NextResponse.json(
      {
        error: reservationsUpdateHint(admin != null),
        code: 'reservations_not_updated',
      },
      { status: admin != null ? 404 : 503 }
    );
  }

  const { data: profile } = await db
    .from('profiles')
    .select('no_show_count, consecutive_attendances')
    .eq('id', targetUserId)
    .single();

  let noShow = Number(profile?.no_show_count ?? 0);
  const consecutive = Number(profile?.consecutive_attendances ?? 0);
  const newIsPresent = reservationIsPresent(attended);

  if (newIsPresent) {
    try {
      noShow = await syncNoShowCountAfterAdminClear(
        db,
        targetUserId,
        noShow,
        shouldUndoNoShowForScreeningUser(priorValues, attended)
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to sync no_show_count';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (newIsPresent && shouldIncrementConsecutiveAttendance(priorValues, true)) {
    const streak = profileUpdatesAfterConsecutiveAttendance(consecutive, noShow);
    const profilePatch: {
      consecutive_attendances: number;
      no_show_count?: number;
    } = { consecutive_attendances: streak.consecutive_attendances };
    if (streak.no_show_count !== undefined) {
      profilePatch.no_show_count = streak.no_show_count;
    }
    noShow = streak.noShow;
    const { error: profileErr } = await db
      .from('profiles')
      .update(profilePatch)
      .eq('id', targetUserId);
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }
  } else if (!newIsPresent) {
    if (!shouldApplyNoShowForScreeningUser(priorValues)) {
      return NextResponse.json({
        ok: true,
        reservationsUpdated: updatedRows.length,
        no_show_count: noShow,
      });
    }
    let next = noShow;
    try {
      const falseScreeningCount = await countNoShowScreeningsForUser(db, targetUserId);
      next = noShowCountAfterAdminMark(noShow, falseScreeningCount);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to count no-shows';
      return NextResponse.json({ error: message }, { status: 500 });
    }
    const { error: profileErr } = await db
      .from('profiles')
      .update({
        consecutive_attendances: 0,
        no_show_count: next,
      })
      .eq('id', targetUserId);
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }
    noShow = next;
  }

  return NextResponse.json({
    ok: true,
    reservationsUpdated: updatedRows.length,
    no_show_count: noShow,
  });
}
