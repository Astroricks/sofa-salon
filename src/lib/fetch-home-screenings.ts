import type { SupabaseClient } from '@supabase/supabase-js';

const SELECT_HOME =
  'id, title, screening_at, description, room_id, year, director, duration_minutes, douban_url, letterboxd_url, trailer_url, rooms(furniture_json)';

/** Upcoming active screenings for the home page. */
export async function fetchUpcomingScreeningsForHome(client: SupabaseClient) {
  const now = new Date().toISOString();
  return client
    .from('screenings')
    .select(SELECT_HOME)
    .eq('is_active', true)
    .gte('screening_at', now)
    .order('screening_at', { ascending: true });
}
