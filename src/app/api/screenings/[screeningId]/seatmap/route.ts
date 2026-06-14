import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadSeatmapPayload } from '@/lib/fetch-seatmap-payload';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Returns seatmap data (room, reservations with profiles, waitlist).
 * Profile includes display_name, avatar_config, no_show_count for everyone;
 * wechat_id only when the requesting user is admin (so non-admins never receive it).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ screeningId: string }> }
) {
  const { screeningId } = await params;
  if (!screeningId) {
    return NextResponse.json({ error: 'screeningId required' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    isAdmin = profile?.is_admin === true;
  }

  // Public seat-map data is covered by SELECT RLS policies. Prefer the
  // service-role client when configured, but keep self-hosted/forked
  // deployments functional when only the public Supabase key is available.
  const seatmapClient = createAdminClient() ?? supabase;
  const payload = await loadSeatmapPayload(seatmapClient, screeningId, {
    includeAdminContact: isAdmin,
  });
  if (!payload) {
    return NextResponse.json({ error: 'Screening not found' }, { status: 404 });
  }

  return NextResponse.json(payload);
}
