import { hasProfileContact } from '@/lib/contact-platform';
import {
  isAuthInfrastructureError,
  isSupabaseInfrastructureError,
} from '@/lib/supabase-infrastructure-error';
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

  // Public pages (home, screening, leaderboard) must not block on Auth/DB — layout Ticker hits REST.
  const needsAuthMiddleware =
    path.startsWith('/admin') || path.startsWith('/profile');
  if (!needsAuthMiddleware) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[middleware] missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
  });

  let user: { id: string } | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      if (isAuthInfrastructureError(error)) {
        console.error('[middleware] Supabase Auth unavailable:', error.message ?? error);
        return response;
      }
      // Missing/invalid session — treat as logged out
    } else {
      user = data.user;
    }
  } catch (err) {
    if (isAuthInfrastructureError(err)) {
      console.error('[middleware] Supabase Auth fetch failed:', err);
      return response;
    }
    throw err;
  }

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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wechat_id, contact_platform, contact_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        // no profile row
      } else if (isSupabaseInfrastructureError(profileError)) {
        console.error('[middleware] profiles fetch unavailable:', profileError.message);
        return response;
      }
    } else if (!hasProfileContact(profile) && path !== '/profile/setup') {
      const redirect = new URL('/profile/setup', request.url);
      redirect.searchParams.set('redirect', path);
      return NextResponse.redirect(redirect);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Skip API routes — they validate auth themselves; running getUser() here doubled
     * Supabase traffic and caused site-wide 504s when Auth was slow.
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
