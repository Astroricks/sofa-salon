import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type UserInfo = {
  display_name: string | null;
  wechat_id: string | null;
  email: string | null;
};

export async function GET() {
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

  const admin = (await import('@/lib/supabase/admin')).createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  const { data: logsRaw, error } = await admin
    .from('support_logs')
    .select('id, type, screening_id, user_id, priority, message, created_at, status, resolved_at, resolved_by')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const logs = (logsRaw ?? []).filter((l: { type: string }) => l.type !== 'reschedule_request');

  const { data: proposals } = await admin
    .from('reschedule_proposals')
    .select('id, screening_id, created_by, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  const screeningIds = [...new Set((proposals ?? []).map((p: { screening_id: string }) => p.screening_id))];
  const screeningTitles: Record<string, string> = {};
  const proposalOptions: Record<string, { id: string; option_date: string; time_slot: string; position: number }[]> = {};
  if (screeningIds.length > 0) {
    const { data: screenings } = await admin
      .from('screenings')
      .select('id, title')
      .in('id', screeningIds);
    for (const s of screenings ?? []) {
      screeningTitles[s.id] = s.title ?? '';
    }
    const { data: options } = await admin
      .from('reschedule_options')
      .select('id, proposal_id, option_date, time_slot, position')
      .in('proposal_id', (proposals ?? []).map((p: { id: string }) => p.id));
    const proposalIdToScreening: Record<string, string> = {};
    for (const p of proposals ?? []) {
      proposalIdToScreening[p.id] = p.screening_id;
    }
    for (const o of options ?? []) {
      const pid = o.proposal_id;
      if (!proposalOptions[pid]) proposalOptions[pid] = [];
      proposalOptions[pid].push({
        id: o.id,
        option_date: o.option_date,
        time_slot: o.time_slot,
        position: o.position,
      });
    }
    for (const pid of Object.keys(proposalOptions)) {
      proposalOptions[pid].sort((a, b) => a.position - b.position);
    }
  }

  const userIds = new Set<string>();
  for (const log of logs ?? []) {
    if (log.user_id) userIds.add(log.user_id);
  }
  for (const p of proposals ?? []) {
    if (p.created_by) userIds.add(p.created_by);
  }

  const userInfo: Record<string, UserInfo> = {};
  if (userIds.size > 0) {
    const ids = Array.from(userIds);
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, display_name, wechat_id')
      .in('id', ids);
    for (const row of profiles ?? []) {
      userInfo[row.id] = {
        display_name: row.display_name ?? null,
        wechat_id: row.wechat_id ?? null,
        email: null,
      };
    }
    for (const uid of ids) {
      try {
        const { data: authUser } = await admin.auth.admin.getUserById(uid);
        const email = authUser?.user?.email ?? null;
        if (!userInfo[uid]) userInfo[uid] = { display_name: null, wechat_id: null, email };
        else userInfo[uid].email = email;
      } catch {
        if (!userInfo[uid]) userInfo[uid] = { display_name: null, wechat_id: null, email: null };
      }
    }
  }

  return NextResponse.json({
    supportLogs: logs,
    rescheduleProposals: proposals ?? [],
    screeningTitles: screeningTitles as Record<string, string>,
    proposalOptions: proposalOptions as Record<string, { id: string; option_date: string; time_slot: string; position: number }[]>,
    userInfo,
  });
}
