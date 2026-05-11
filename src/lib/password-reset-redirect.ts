/**
 * Builds the `redirectTo` URL passed to `supabase.auth.resetPasswordForEmail`.
 * User opens Supabase recovery link → lands on `/auth/callback?...` → session exchanged → redirect to `/auth/update-password` (optional post-login path).
 */
export function buildPasswordResetCallbackUrl(
  origin: string,
  redirectAfterPasswordUpdate: string
): string {
  const base = origin.replace(/\/$/, '');
  const nextPath =
    redirectAfterPasswordUpdate && redirectAfterPasswordUpdate !== '/'
      ? `/auth/update-password?redirect=${encodeURIComponent(redirectAfterPasswordUpdate)}`
      : '/auth/update-password';
  return `${base}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}
