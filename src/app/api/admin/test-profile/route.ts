/**
 * Admin-only: get/set current user's no_show_count for pigeon / blood bar testing.
 * Badge tier is read-only from reservation history (RPC).
 */
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { fetchAttendanceCountForUser } from '@/lib/attendance';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, no_show_count')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const badgeAttendanceCount = await fetchAttendanceCountForUser(supabase, user.id);
  return NextResponse.json({
    no_show_count: profile.no_show_count ?? 0,
    badge_attendance_count: badgeAttendanceCount,
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
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

  const body = await req.json();
  const noShowCount = typeof body.no_show_count === 'number' ? Math.max(0, Math.min(3, body.no_show_count)) : undefined;

  if (noShowCount === undefined) {
    return NextResponse.json({ error: 'Provide no_show_count' }, { status: 400 });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ no_show_count: noShowCount, consecutive_attendances: 0 })
    .eq('id', user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
