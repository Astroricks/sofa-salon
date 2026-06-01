import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendHostContactMessage } from '@/lib/email';
import { hostContactSendErrorCode, parseHostContactBody } from '@/lib/host-contact';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_subject' }, { status: 400 });
  }

  const parsed = parseHostContactBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.code }, { status: 400 });
  }

  const locale =
    typeof (body as Record<string, unknown>).locale === 'string' &&
    (body as Record<string, unknown>).locale === 'zh'
      ? 'zh'
      : 'en';

  let signedInUserId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedInUserId = user?.id ?? null;
  } catch {
    signedInUserId = null;
  }

  try {
    const result = await sendHostContactMessage({
      ...parsed.data,
      locale,
      signedInUserId,
    });
    if (result === null) {
      return NextResponse.json({ error: 'email_not_configured' }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('host-contact send failed', e);
    return NextResponse.json({ error: hostContactSendErrorCode(e) }, { status: 500 });
  }
}
