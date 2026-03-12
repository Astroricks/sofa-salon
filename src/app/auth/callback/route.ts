// import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * OAuth callback — used only for Google (or other OAuth) sign-in.
 * For email/password auth there is no callback; signIn/signUp redirect on the client.
 * Commented out so we can test with email/password; uncomment to re-enable Google OAuth.
 */
export async function GET(request: Request) {
  // const { searchParams, origin } = new URL(request.url);
  // const code = searchParams.get('code');
  // const next = searchParams.get('next') ?? '/';

  // if (code) {
  //   const supabase = await createClient();
  //   const { error } = await supabase.auth.exchangeCodeForSession(code);
  //   if (!error) {
  //     return NextResponse.redirect(`${origin}${next}`);
  //   }
  // }

  // return NextResponse.redirect(`${origin}/auth/login?error=auth`);

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/auth/login`);
}
