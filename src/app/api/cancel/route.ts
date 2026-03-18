/**
 * POST /api/cancel — Cancel a reservation.
 * Policy: if the user cancels within cancel_no_show_hours (default 24) before screening_at,
 * it counts as a no-show (blood bar segment lost; see ticker_config and admin settings).
 */
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendCancelConfirmation, sendWaitlistPromotion } from '@/lib/email';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const body = await req.json();
  const { reservationId } = body;
  if (!reservationId) {
    return NextResponse.json(
      { error: 'reservationId required' },
      { status: 400 }
    );
  }

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id, screening_id, seat_key, user_id')
    .eq('id', reservationId)
    .single();

  if (!reservation || reservation.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found or not your reservation' }, { status: 404 });
  }

  const screeningId = reservation.screening_id;
  const freedSeatKey = reservation.seat_key;

  const [{ data: screening }, { data: configRows }] = await Promise.all([
    supabase
      .from('screenings')
      .select('screening_at, waitlist_mode, title')
      .eq('id', screeningId)
      .single(),
    supabase.from('ticker_config').select('key, value').eq('key', 'cancel_no_show_hours'),
  ]);

  const configHoursRow = (configRows ?? []).find((r: { key: string }) => r.key === 'cancel_no_show_hours');
  const hours = configHoursRow
    ? Math.max(0, parseInt((configHoursRow as { value: string }).value, 10) || 24)
    : 24;
  const windowMs = hours * 60 * 60 * 1000;

  const countsAsNoShow =
    screening?.screening_at &&
    (() => {
      const at = new Date(screening.screening_at).getTime();
      const now = Date.now();
      return at > now && at - now <= windowMs;
    })();

  let noShowCount: number | undefined;
  if (countsAsNoShow) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('no_show_count')
      .eq('id', user.id)
      .single();
    const current = Math.min(Number(profile?.no_show_count ?? 0), 3);
    const next = Math.min(current + 1, 3);
    await supabase
      .from('profiles')
      .update({ no_show_count: next })
      .eq('id', user.id);
    await supabase
      .from('profiles')
      .update({ consecutive_attendances: 0 })
      .eq('id', user.id);
    noShowCount = next;
  }

  const { error: delError } = await supabase
    .from('reservations')
    .delete()
    .eq('id', reservationId);

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 400 });
  }

  // Send cancel confirmation to the user who cancelled
  let cancelUserEmail: string | undefined = user.email ?? undefined;
  if (!cancelUserEmail) {
    const admin = (await import('@/lib/supabase/admin')).createAdminClient();
    if (admin) {
      const { data: u } = await admin.auth.admin.getUserById(user.id);
      cancelUserEmail = u?.user?.email;
    }
  }
  if (cancelUserEmail) {
    try {
      await sendCancelConfirmation({
        to: cancelUserEmail,
        screeningTitle: screening?.title ?? 'Screening',
        seatKey: freedSeatKey,
        screeningAt: screening?.screening_at ? new Date(screening.screening_at).toLocaleString() : '',
      });
    } catch {
      // ignore
    }
  }

  if (screening?.waitlist_mode === 'auto') {
    const adminForPromote = (await import('@/lib/supabase/admin')).createAdminClient();
    const { data: first } = adminForPromote
      ? await adminForPromote
          .from('waitlist')
          .select('id, user_id')
          .eq('screening_id', screeningId)
          .eq('status', 'waiting')
          .order('position', { ascending: true })
          .limit(1)
          .single()
      : await supabase
          .from('waitlist')
          .select('id, user_id')
          .eq('screening_id', screeningId)
          .eq('status', 'waiting')
          .order('position', { ascending: true })
          .limit(1)
          .single();

    if (first && adminForPromote) {
      const { error: insertError } = await adminForPromote.from('reservations').insert({
        screening_id: screeningId,
        user_id: first.user_id,
        seat_key: freedSeatKey,
        is_squeezed: false,
      });

      if (!insertError) {
        await adminForPromote
          .from('waitlist')
          .update({ status: 'promoted' })
          .eq('id', first.id);

        await adminForPromote.rpc('reorder_waitlist', {
          p_screening_id: screeningId,
        });

        let email: string | undefined;
        const { data: userData } = await adminForPromote.auth.admin.getUserById(first.user_id);
        email = userData?.user?.email;
        if (email) {
          try {
            await sendWaitlistPromotion({
              to: email,
              screeningTitle: screening.title,
              seatKey: freedSeatKey,
              screeningAt: new Date(screening.screening_at).toLocaleString(),
            });
          } catch {
            // ignore
          }
        }
      }
    }
  }

  // Return updated reservations so the client can show the promoted person (and current state) immediately
  const adminClient = (await import('@/lib/supabase/admin')).createAdminClient();
  let updatedReservations: unknown[] | null = null;
  if (adminClient) {
    const { data: rows } = await adminClient
      .from('reservations')
      .select('id, seat_key, user_id, is_squeezed, is_ghost, ghost_name, ghost_avatar, friend_avatar, attended, created_at, profiles(display_name, avatar_config, wechat_id, no_show_count, attendance_count)')
      .eq('screening_id', screeningId);
    updatedReservations = rows ?? [];
  }

  return NextResponse.json({
    ok: true,
    ...(noShowCount !== undefined && {
      noShowCount,
      isPigeon: noShowCount >= 3,
    }),
    ...(updatedReservations && { reservations: updatedReservations }),
  });
}
