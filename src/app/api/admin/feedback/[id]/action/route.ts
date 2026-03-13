import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendBugFixedNotification } from '@/lib/email';

const TYPE_LABELS_ZH: Record<string, string> = {
  cancel_issue: '取消座位问题',
  seat_gone: '座位不见了',
  booking_cancelled: '预约被取消',
  page_broken: '页面打不开',
  cant_select: '选不了座位',
  reschedule_request: '改期请求',
};

const TYPE_LABELS_EN: Record<string, string> = {
  cancel_issue: 'Cancel seat issue',
  seat_gone: 'Seat disappeared',
  booking_cancelled: 'Booking cancelled',
  page_broken: 'Page not loading',
  cant_select: "Can't select seat",
  reschedule_request: 'Reschedule request',
};

/** POST /api/admin/feedback/[id]/action — body: { action: 'fixed' | 'dismiss' }. Never deletes the record. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id: logId } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;
  if (action !== 'fixed' && action !== 'dismiss') {
    return NextResponse.json({ error: 'action must be "fixed" or "dismiss"' }, { status: 400 });
  }

  const admin = (await import('@/lib/supabase/admin')).createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  const { data: log, error: fetchErr } = await admin
    .from('support_logs')
    .select('id, type, user_id, status')
    .eq('id', logId)
    .single();
  if (fetchErr || !log) {
    return NextResponse.json({ error: 'Support log not found' }, { status: 404 });
  }

  const status = log.status as string | null;
  if (status && status !== 'open') {
    return NextResponse.json(
      { error: 'Log already resolved or dismissed' },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const newStatus = action === 'fixed' ? 'fixed' : 'dismissed';
  const { error: updateErr } = await admin
    .from('support_logs')
    .update({
      status: newStatus,
      resolved_at: now,
      resolved_by: user.id,
    })
    .eq('id', logId);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  if (action === 'fixed' && log.user_id) {
    let email: string | null = null;
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(log.user_id);
      email = authUser?.user?.email ?? null;
    } catch {
      // skip
    }
    const issueLabel =
      TYPE_LABELS_ZH[log.type as string] ??
      TYPE_LABELS_EN[log.type as string] ??
      (log.type as string);
    if (email) {
      try {
        await sendBugFixedNotification({
          to: email,
          issueTypeLabel: issueLabel,
          locale: 'zh',
        });
      } catch {
        // Don't fail the request if email fails
      }
    }
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
