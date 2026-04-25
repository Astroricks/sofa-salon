import type { SupabaseClient } from '@supabase/supabase-js';

const ROOMS_EMBED = `rooms (
          name,
          furniture_json,
          decorations_json,
          canvas_w,
          canvas_h,
          room_background_id
        )`;

const SELECT_DETAIL = `
        id,
        title,
        description,
        year,
        director,
        duration_minutes,
        screening_at,
        squeeze_note,
        waitlist_mode,
        room_id,
        douban_url,
        letterboxd_url,
        trailer_url,
        ${ROOMS_EMBED}
      `;

/** Loads one screening row for `/screening/[id]` (includes Douban / Letterboxd URLs). */
export async function fetchScreeningDetailRow(client: SupabaseClient, id: string) {
  return client.from('screenings').select(SELECT_DETAIL).eq('id', id).single();
}
