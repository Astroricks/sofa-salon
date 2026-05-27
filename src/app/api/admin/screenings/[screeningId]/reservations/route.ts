import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  findProfilesByDisplayName,
  getScreeningRoomSeatKeys,
  getUserEmail,
  normalizeDisplayNameQuery,
  pickSeatKeyForAdminAdd,
} from '@/lib/admin-screening-reservations';
import { getProfileContact, hasProfileContact } from '@/lib/contact-platform';
import { sendAdminRemovedFromScreening, sendConfirmation } from '@/lib/email';
import { formatScreeningAtForEmail, isScreeningPast } from '@/lib/screening-datetime';
import { NextRequest, NextResponse } from 'next/server';

const MAX_REMOVAL_MESSAGE = 2000;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  const admin = createAdminClient();
  return { supabase, admin, db: admin ?? supabase };
}

/** Admin: add an existing user to this screening by display name (or userId after disambiguation). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ screeningId: string }> }
) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { db, admin } = auth;
  const { screeningId } = await params;
  const body = await req.json();
  const displayName =
    typeof body.displayName === 'string' ? body.displayName : '';
  const userId = typeof body.userId === 'string' ? body.userId : undefined;

  if (!screeningId) {
    return NextResponse.json({ error: 'screeningId required' }, { status: 400 });
  }

  const { data: screening } = await db
    .from('screenings')
    .select('id, title, screening_at, duration_minutes')
    .eq('id', screeningId)
    .single();
  if (!screening) {
    return NextResponse.json({ error: 'Screening not found' }, { status: 404 });
  }

  let targetUserId = userId;
  if (!targetUserId) {
    const q = normalizeDisplayNameQuery(displayName);
    if (!q) {
      return NextResponse.json({ error: 'displayName required' }, { status: 400 });
    }
    const matches = await findProfilesByDisplayName(db, q);
    if (matches.length === 0) {
      return NextResponse.json(
        { error: 'display_name_not_found', code: 'display_name_not_found' },
        { status: 404 }
      );
    }
    if (matches.length > 1) {
      return NextResponse.json(
        {
          error: 'display_name_ambiguous',
          code: 'display_name_ambiguous',
          candidates: matches.map((m) => ({
            id: m.id,
            display_name: m.display_name,
            contact_platform: m.contact_platform,
            contact_id: m.contact_id,
            wechat_id: m.wechat_id,
          })),
        },
        { status: 409 }
      );
    }
    targetUserId = matches[0].id;
  }

  const { data: guestProfile } = await db
    .from('profiles')
    .select('display_name, wechat_id, contact_platform, contact_id')
    .eq('id', targetUserId)
    .single();
  if (!guestProfile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (!hasProfileContact(guestProfile)) {
    return NextResponse.json(
      { error: 'user_missing_wechat', code: 'user_missing_wechat' },
      { status: 400 }
    );
  }
  const guestContact = getProfileContact(guestProfile);

  const { count: existingCount } = await db
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .eq('screening_id', screeningId)
    .eq('user_id', targetUserId)
    .or('is_ghost.eq.false,is_ghost.is.null');
  if ((existingCount ?? 0) > 0) {
    return NextResponse.json(
      { error: 'user_already_reserved', code: 'user_already_reserved' },
      { status: 400 }
    );
  }

  const roomSeats = await getScreeningRoomSeatKeys(db, screeningId);
  const roomSeatKeys = roomSeats?.seatKeys ?? [];

  const { data: existingReservations } = await db
    .from('reservations')
    .select('seat_key')
    .eq('screening_id', screeningId);
  const taken = new Set(
    (existingReservations ?? []).map((r: { seat_key: string }) => r.seat_key)
  );
  const picked = pickSeatKeyForAdminAdd({
    userId: targetUserId,
    screeningAt: screening.screening_at,
    roomSeatKeys,
    takenSeatKeys: taken,
  });
  if (!picked) {
    return NextResponse.json({ error: 'no_seats_available', code: 'no_seats_available' }, { status: 400 });
  }
  const { seatKey, isCatalog } = picked;

  const isSqueezed = !isCatalog && seatKey.includes('squeeze');
  const { data: row, error: insertError } = await db
    .from('reservations')
    .insert({
      screening_id: screeningId,
      user_id: targetUserId,
      seat_key: seatKey,
      is_squeezed: isSqueezed,
      is_ghost: false,
    })
    .select('id, seat_key')
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  if (admin && !isScreeningPast(screening.screening_at)) {
    const email = await getUserEmail(admin, targetUserId);
    if (email) {
      try {
        await sendConfirmation({
          to: email,
          screeningTitle: screening.title,
          seatKey: row.seat_key,
          displayName: guestProfile.display_name ?? 'Guest',
          contactPlatform: guestContact.platform,
          contactId: guestContact.id,
          screeningAt: formatScreeningAtForEmail(screening.screening_at),
          calendar: {
            screeningId,
            screeningAtIso: new Date(screening.screening_at).toISOString(),
            durationMinutes:
              screening.duration_minutes != null
                ? Number(screening.duration_minutes)
                : null,
          },
        });
      } catch {
        // reservation stands even if email fails
      }
    }
  }

  return NextResponse.json({
    ok: true,
    reservation: row,
    user: {
      id: targetUserId,
      display_name: guestProfile.display_name,
    },
  });
}

/** Admin: remove a user from this screening and email them with a custom host message. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ screeningId: string }> }
) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { db, admin } = auth;
  const { screeningId } = await params;
  const body = await req.json();
  const userId = typeof body.userId === 'string' ? body.userId : '';
  const message = typeof body.message === 'string' ? body.message : '';

  if (!screeningId || !userId) {
    return NextResponse.json(
      { error: 'screeningId and userId required' },
      { status: 400 }
    );
  }
  if (message.length > MAX_REMOVAL_MESSAGE) {
    return NextResponse.json(
      { error: `Message must be at most ${MAX_REMOVAL_MESSAGE} characters` },
      { status: 400 }
    );
  }

  const { data: screening } = await db
    .from('screenings')
    .select('id, title, screening_at, waitlist_mode, duration_minutes')
    .eq('id', screeningId)
    .single();
  if (!screening) {
    return NextResponse.json({ error: 'Screening not found' }, { status: 404 });
  }

  const { data: toRemove } = await db
    .from('reservations')
    .select('id, seat_key')
    .eq('screening_id', screeningId)
    .eq('user_id', userId)
    .or('is_ghost.eq.false,is_ghost.is.null');

  if (!toRemove?.length) {
    return NextResponse.json(
      { error: 'user_not_on_screening', code: 'user_not_on_screening' },
      { status: 404 }
    );
  }

  const freedSeatKey = toRemove[0].seat_key;
  const ids = toRemove.map((r) => r.id);

  const { error: delError } = await db.from('reservations').delete().in('id', ids);
  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 400 });
  }

  const past = isScreeningPast(screening.screening_at);

  if (admin && !past) {
    const email = await getUserEmail(admin, userId);
    if (email) {
      try {
        await sendAdminRemovedFromScreening({
          to: email,
          screeningTitle: screening.title,
          screeningAt: formatScreeningAtForEmail(screening.screening_at),
          customMessage: message,
        });
      } catch {
        // removal stands even if email fails
      }
    }
  }

  if (screening.waitlist_mode === 'auto' && admin && !past) {
    const { data: first } = await admin
      .from('waitlist')
      .select('id, user_id')
      .eq('screening_id', screeningId)
      .eq('status', 'waiting')
      .order('position', { ascending: true })
      .limit(1)
      .single();

    if (first) {
      const { error: insertError } = await admin.from('reservations').insert({
        screening_id: screeningId,
        user_id: first.user_id,
        seat_key: freedSeatKey,
        is_squeezed: false,
      });
      if (!insertError) {
        await admin
          .from('waitlist')
          .update({ status: 'promoted' })
          .eq('id', first.id);
        await admin.rpc('reorder_waitlist', { p_screening_id: screeningId });
      }
    }
  }

  return NextResponse.json({ ok: true, removedCount: ids.length });
}
