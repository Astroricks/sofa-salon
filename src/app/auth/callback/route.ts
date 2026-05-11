import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Get the public origin for redirects (avoids localhost when deployed behind a proxy).
 * Prefer x-forwarded-host / x-forwarded-proto, then NEXT_PUBLIC_APP_URL, then request.url.
 */
function getRedirectOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedHost) {
    const proto = forwardedProto ?? url.protocol.replace(':', '');
    return `${proto}://${forwardedHost}`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const base = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
    return base;
  }
  return url.origin;
}

/**
 * Auth callback: exchanges PKCE `code` for a session, then redirects to `next`.
 * Used for Google OAuth and for password-recovery links when Supabase sends users here first.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const safeNext = next.startsWith('/') ? next : '/';
  const origin = getRedirectOrigin(request);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth`);
}
