import { createClient } from '@/lib/supabase/server';
import { shouldApplyNoShowForReservationRow } from '@/lib/attendance';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
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

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Reservation id required' }, { status: 400 });
  }

  const body = await req.json();
  const { attended } = body;
  if (attended !== true && attended !== false && attended !== null) {
    return NextResponse.json(
      { error: 'attended must be true, false, or null' },
      { status: 400 }
    );
  }

  const { data: before } = await supabase
    .from('reservations')
    .select('id, screening_id, user_id, attended')
    .eq('id', id)
    .single();

  if (!before?.user_id || !before.screening_id) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
  }

  const { data: siblings } = await supabase
    .from('reservations')
    .select('id, attended')
    .eq('screening_id', before.screening_id)
    .eq('user_id', before.user_id);

  const otherSeatHadAttendedTrue =
    siblings?.some((r) => r.id !== before.id && r.attended === true) ?? false;
  const thisWasAttendedTrue = before.attended === true;
  const hadScreeningAttendedCounted = thisWasAttendedTrue || otherSeatHadAttendedTrue;

  const otherSeatHadAttendedFalse =
    siblings?.some((r) => r.id !== before.id && r.attended === false) ?? false;

  const { data: reservation, error } = await supabase
    .from('reservations')
    .update({ attended: attended ?? null })
    .eq('id', id)
    .select('id, attended, user_id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const userId = reservation?.user_id;
  if (!userId) {
    return NextResponse.json(reservation);
  }

  const { data: guestProfile } = await supabase
    .from('profiles')
    .select('no_show_count, consecutive_attendances')
    .eq('id', userId)
    .single();

  const noShow = Number(guestProfile?.no_show_count ?? 0);
  const consecutive = Number(guestProfile?.consecutive_attendances ?? 0);

  if (attended === true) {
    const firstTimeCountedForScreening = !hadScreeningAttendedCounted;
    if (!firstTimeCountedForScreening) {
      return NextResponse.json(reservation);
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
    const { error: profileErr } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }
  } else if (attended === false) {
    if (!shouldApplyNoShowForReservationRow(before.attended, otherSeatHadAttendedFalse)) {
      return NextResponse.json(reservation);
    }
    const current = Math.min(noShow, 3);
    const next = Math.min(current + 1, 3);
    const updates = {
      consecutive_attendances: 0,
      no_show_count: next,
    };
    const { error: profileErr } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }
  }

  return NextResponse.json(reservation);
}
