import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/** Default hours before screening: cancel within this window counts as no-show (blood bar). Admin can change in Settings. */
const DEFAULT_CANCEL_NO_SHOW_HOURS = 24;
const CONFIG_KEY = 'cancel_no_show_hours';

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

  const { data } = await supabase
    .from('ticker_config')
    .select('key, value')
    .in('key', [CONFIG_KEY]);

  const row = (data ?? []).find((r: { key: string }) => r.key === CONFIG_KEY);
  const value = row ? (row as { value: string }).value : null;
  const hours = value != null ? Math.max(0, parseInt(value, 10) || DEFAULT_CANCEL_NO_SHOW_HOURS) : DEFAULT_CANCEL_NO_SHOW_HOURS;

  return NextResponse.json({ cancel_no_show_hours: hours });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const auth = await requireAdmin(supabase);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const hours = typeof body.cancel_no_show_hours === 'number'
    ? Math.max(0, Math.min(168, body.cancel_no_show_hours)) // cap 168 (1 week)
    : typeof body.cancel_no_show_hours === 'string'
      ? Math.max(0, Math.min(168, parseInt(body.cancel_no_show_hours, 10) || DEFAULT_CANCEL_NO_SHOW_HOURS))
      : null;
  if (hours == null) {
    return NextResponse.json({ error: 'cancel_no_show_hours required (number)' }, { status: 400 });
  }

  await supabase
    .from('ticker_config')
    .upsert({ key: CONFIG_KEY, value: String(hours) }, { onConflict: 'key' });

  return NextResponse.json({ cancel_no_show_hours: hours });
}
