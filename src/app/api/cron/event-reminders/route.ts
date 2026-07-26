/**
 * Cron: send event reminder emails (活动提示) before screening.
 * Call with Authorization: Bearer <CRON_SECRET> or ?secret=<CRON_SECRET>.
 * Run hourly. Sends one reminder per user per screening for screenings taking
 * place about 24 hours later, unless the user has opted out.
 */
import { NextRequest, NextResponse } from 'next/server';
import { sendReminder } from '@/lib/email';
import { formatScreeningAtForEmail } from '@/lib/screening-datetime';

const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;
const REMINDER_WINDOW_MS = 30 * 60 * 1000;
const STALE_CLAIM_MS = 90 * 60 * 1000;

function getCronSecret(): string | null {
  return process.env.CRON_SECRET ?? null;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = getCronSecret();
  if (!secret) return false;
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ') && auth.slice(7) === secret) return true;
  const q = req.nextUrl.searchParams.get('secret');
  return q === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() + REMINDER_LEAD_MS - REMINDER_WINDOW_MS);
  const windowEnd = new Date(now.getTime() + REMINDER_LEAD_MS + REMINDER_WINDOW_MS);

  const admin = (await import('@/lib/supabase/admin')).createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 });
  }

  const { data: screenings, error: screeningsError } = await admin
    .from('screenings')
    .select('id, title, screening_at, duration_minutes')
    .gte('screening_at', windowStart.toISOString())
    .lt('screening_at', windowEnd.toISOString())
    .eq('is_active', true);

  if (screeningsError) {
    return NextResponse.json({ error: screeningsError.message }, { status: 500 });
  }

  if (!screenings?.length) {
    return NextResponse.json({
      sent: 0,
      message: 'No screenings in the 24-hour reminder window',
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
    });
  }

  let sent = 0;
  let skippedPreference = 0;
  let skippedAlreadyClaimed = 0;
  let failed = 0;

  for (const screening of screenings) {
    const staleBefore = new Date(now.getTime() - STALE_CLAIM_MS).toISOString();
    await admin
      .from('event_reminder_deliveries')
      .delete()
      .eq('screening_id', screening.id)
      .is('sent_at', null)
      .lt('claimed_at', staleBefore);

    const { data: reservations, error: reservationsError } = await admin
      .from('reservations')
      .select('user_id')
      .eq('screening_id', screening.id)
      .or('is_ghost.eq.false,is_ghost.is.null');

    if (reservationsError) {
      failed++;
      continue;
    }

    const userIds = Array.from(new Set((reservations ?? []).map((r: { user_id: string }) => r.user_id)));
    const screeningAt = formatScreeningAtForEmail(screening.screening_at);

    for (const userId of userIds) {
      const { data: profile } = await admin
        .from('profiles')
        .select('email_event_reminder')
        .eq('id', userId)
        .maybeSingle();
      if ((profile as { email_event_reminder?: boolean } | null)?.email_event_reminder === false) {
        skippedPreference++;
        continue;
      }

      const { data: userData } = await admin.auth.admin.getUserById(userId);
      const email = userData?.user?.email;
      if (!email) continue;

      const { error: claimError } = await admin
        .from('event_reminder_deliveries')
        .insert({ screening_id: screening.id, user_id: userId });
      if (claimError) {
        if (claimError.code === '23505') {
          skippedAlreadyClaimed++;
        } else {
          failed++;
        }
        continue;
      }

      try {
        await sendReminder({
          to: email,
          screeningTitle: screening.title ?? 'Screening',
          screeningAt,
          calendar: {
            screeningId: screening.id,
            screeningAtIso: new Date(screening.screening_at).toISOString(),
            durationMinutes:
              screening.duration_minutes != null
                ? Number(screening.duration_minutes)
                : null,
          },
        });
        const { error: sentMarkError } = await admin
          .from('event_reminder_deliveries')
          .update({ sent_at: new Date().toISOString() })
          .eq('screening_id', screening.id)
          .eq('user_id', userId);
        if (sentMarkError) throw sentMarkError;
        sent++;
      } catch {
        failed++;
        await admin
          .from('event_reminder_deliveries')
          .delete()
          .eq('screening_id', screening.id)
          .eq('user_id', userId)
          .is('sent_at', null);
      }
    }
  }

  return NextResponse.json({
    sent,
    screenings: screenings.length,
    skippedPreference,
    skippedAlreadyClaimed,
    failed,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
  });
}
