import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const code = request.nextUrl.searchParams.get('code');

  // Recovery / OAuth PKCE: if Supabase falls back to Site URL (e.g. `/`) because `redirectTo`
  // was not in Supabase → Auth → Redirect URLs, the `code` never reaches `/auth/callback` and
  // no session is set. Forward to callback so `exchangeCodeForSession` runs (this app always
  // uses `/auth/callback` for OAuth; only misconfigured recovery should hit `/` with `code`).
  if (code && path === '/' && !request.nextUrl.searchParams.get('error')) {
    const callback = new URL('/auth/callback', request.url);
    callback.searchParams.set('code', code);
    callback.searchParams.set('next', '/auth/update-password');
    return NextResponse.redirect(callback);
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (path.startsWith('/admin') || path === '/profile') {
    if (!user) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (path.startsWith('/profile/setup') || path.startsWith('/auth/')) {
    return response;
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('wechat_id')
      .eq('id', user.id)
      .single();

    const wechatEmpty =
      profile?.wechat_id == null || String(profile.wechat_id).trim() === '';

    if (wechatEmpty && path !== '/profile/setup') {
      const redirect = new URL('/profile/setup', request.url);
      redirect.searchParams.set('redirect', path);
      return NextResponse.redirect(redirect);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
