/** True when Supabase Auth is unreachable (504, 5xx, retryable fetch). */
export function isAuthInfrastructureError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { status?: number; name?: string; message?: string };
  if (typeof e.status === 'number' && e.status >= 500) return true;
  if (e.name === 'AuthRetryableFetchError') return true;
  const msg = typeof e.message === 'string' ? e.message : '';
  return /gateway_timeout|504|fetch failed|network/i.test(msg);
}

/** True when Supabase REST/PostgREST is unreachable or times out. */
export function isSupabaseInfrastructureError(error: unknown): boolean {
  if (isAuthInfrastructureError(error)) return true;
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  const msg = typeof e.message === 'string' ? e.message : '';
  return /gateway_timeout|504|502|503|fetch failed|timeout|ECONNRESET/i.test(msg);
}
