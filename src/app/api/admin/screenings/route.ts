import { createClient } from '@/lib/supabase/server';
import {
  ADMIN_PAST_PAGE_SIZE,
  ADMIN_SCREENING_LIST_SELECT,
  type AdminScreeningListRow,
} from '@/lib/admin-screenings-list';
import { NextRequest, NextResponse } from 'next/server';

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
  return { supabase };
}

/** Paginated screening list for admin home (past events load more). */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const pastOnly = searchParams.get('past') === '1' || searchParams.get('past') === 'true';
  const offset = Math.max(0, Number.parseInt(searchParams.get('offset') ?? '0', 10) || 0);
  const limitRaw = Number.parseInt(searchParams.get('limit') ?? String(ADMIN_PAST_PAGE_SIZE), 10);
  const limit = Math.min(Math.max(1, limitRaw || ADMIN_PAST_PAGE_SIZE), 100);

  const now = new Date().toISOString();

  let query = auth.supabase
    .from('screenings')
    .select(ADMIN_SCREENING_LIST_SELECT)
    .order('screening_at', { ascending: pastOnly ? false : true });

  if (pastOnly) {
    query = query.lt('screening_at', now);
  } else {
    query = query.gte('screening_at', now);
  }

  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  let total: number | null = null;
  if (pastOnly) {
    const { count, error: countErr } = await auth.supabase
      .from('screenings')
      .select('id', { count: 'exact', head: true })
      .lt('screening_at', now);
    if (countErr) {
      return NextResponse.json({ error: countErr.message }, { status: 400 });
    }
    total = count;
  }

  return NextResponse.json({
    screenings: (data ?? []) as AdminScreeningListRow[],
    offset,
    limit,
    total,
    hasMore: pastOnly && total != null ? offset + (data?.length ?? 0) < total : false,
  });
}
