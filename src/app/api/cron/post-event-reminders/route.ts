/**
 * Cron: send post-event rating reminder emails.
 * Call with Authorization: Bearer <CRON_SECRET> or ?secret=<CRON_SECRET>.
 * Sends to users who had a reservation for a screening that ended in the last 24h
 * and who have email_post_event_rating !== false.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPostEventRatingReminder } from '@/lib/email';
import { CUSTOMER_SITE_ORIGIN } from '@/lib/config';

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

  const supabase = await createClient();
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const { data: screenings } = await supabase
    .from('screenings')
    .select('id, title, screening_at')
    .lt('screening_at', now.toISOString())
    .gte('screening_at', oneDayAgo.toISOString())
    .eq('is_active', true);

  if (!screenings?.length) {
    return NextResponse.json({ sent: 0, message: 'No screenings ended in last 24h' });
  }

  const admin = (await import('@/lib/supabase/admin')).createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 });
  }

  const profileUrl = `${CUSTOMER_SITE_ORIGIN}/profile`;
  let sent = 0;

  for (const screening of screenings) {
    const { data: reservations } = await supabase
      .from('reservations')
      .select('user_id')
      .eq('screening_id', screening.id)
      .or('is_ghost.eq.false,is_ghost.is.null');

    const userIds = Array.from(new Set((reservations ?? []).map((r: { user_id: string }) => r.user_id)));

    for (const userId of userIds) {
      const { data: userData } = await admin.auth.admin.getUserById(userId);
      const email = userData?.user?.email;
      if (!email) continue;
      try {
        await sendPostEventRatingReminder({
          to: email,
          screeningTitle: screening.title ?? 'Screening',
          profileUrl,
        });
        sent++;
      } catch {
        // continue
      }
    }
  }

  return NextResponse.json({ sent, screenings: screenings.length });
}
