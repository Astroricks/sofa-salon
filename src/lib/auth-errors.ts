import type { AuthError } from '@supabase/supabase-js';

/** True when signup failed because this email already has an account (Supabase message variants). */
export function isSignupEmailTakenError(err: Pick<AuthError, 'message' | 'code'>): boolean {
  const msg = (err.message ?? '').toLowerCase();
  const code = (err.code ?? '').toLowerCase();
  return (
    code.includes('already_registered') ||
    code.includes('user_already_registered') ||
    msg.includes('already registered') ||
    msg.includes('already exists') ||
    msg.includes('user already registered')
  );
}
