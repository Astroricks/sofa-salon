import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorised', status: 401 } as const;
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return { error: 'Forbidden', status: 403 } as const;
  return { user } as const;
}

export async function GET() {
  const supabase = await createClient();
  const auth = await requireAdmin(supabase);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [linesRes, configRes] = await Promise.all([
    supabase.from('ticker_custom').select('id, content, sort_order, is_active').order('sort_order', { ascending: true }),
    supabase.from('ticker_config').select('key, value'),
  ]);

  const config: Record<string, string> = {};
  for (const row of configRes.data ?? []) {
    config[(row as { key: string }).key] = (row as { value: string }).value;
  }

  return NextResponse.json({
    customLines: linesRes.data ?? [],
    config: {
      show_upcoming: config.show_upcoming !== 'false',
      show_ratings: config.show_ratings === 'true',
    },
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const auth = await requireAdmin(supabase);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { content, sort_order = 0, is_active = true } = body;
  if (typeof content !== 'string' || content.trim() === '') {
    return NextResponse.json({ error: 'content required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('ticker_custom')
    .insert({ content: content.trim(), sort_order: Number(sort_order) || 0, is_active: !!is_active })
    .select('id, content, sort_order, is_active')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const auth = await requireAdmin(supabase);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  if (body.config !== undefined) {
    const { show_upcoming, show_ratings } = body.config;
    if (typeof show_upcoming === 'boolean') {
      await supabase.from('ticker_config').upsert({ key: 'show_upcoming', value: String(show_upcoming) }, { onConflict: 'key' });
    }
    if (typeof show_ratings === 'boolean') {
      await supabase.from('ticker_config').upsert({ key: 'show_ratings', value: String(show_ratings) }, { onConflict: 'key' });
    }
    return NextResponse.json({ ok: true });
  }

  const { id, content, sort_order, is_active } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const updates: { content?: string; sort_order?: number; is_active?: boolean } = {};
  if (typeof content === 'string') updates.content = content.trim();
  if (typeof sort_order === 'number') updates.sort_order = sort_order;
  if (typeof is_active === 'boolean') updates.is_active = is_active;
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'no updates' }, { status: 400 });

  const { error } = await supabase.from('ticker_custom').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const auth = await requireAdmin(supabase);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await supabase.from('ticker_custom').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
