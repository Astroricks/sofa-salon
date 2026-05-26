import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

/** Service-role client for admin writes that must bypass reservations RLS. */
export function getAdminWriteClient(): SupabaseClient | null {
  return createAdminClient();
}

export function reservationsUpdateHint(hasServiceRole: boolean): string {
  if (hasServiceRole) {
    return 'No reservations updated for this user on this screening.';
  }
  return (
    'Could not update reservation attendance. ' +
    'Add SUPABASE_SERVICE_ROLE_KEY to .env.local and restart npm run dev, ' +
    'or run supabase-sql/30-reservations-admin-update-rls.sql in Supabase SQL Editor.'
  );
}
