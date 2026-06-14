export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { roomCapacity } from '@/lib/furniture';
import type { FurniturePiece } from '@/lib/furniture';
import { fetchUpcomingScreeningsForHome } from '@/lib/fetch-home-screenings';
import { loadSeatmapPayload } from '@/lib/fetch-seatmap-payload';
import { fetchScreeningAltLocaleByIds } from '@/lib/screening-alt-locale-fetch';
import type { SeatmapApiPayload } from '@/lib/seatmap-client-cache';
import HomeSection from '@/components/HomeSection';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  const supabase = await createClient();
  let screeningsRaw: Awaited<ReturnType<typeof fetchUpcomingScreeningsForHome>>['data'] = [];
  const { data, error: homeError } = await fetchUpcomingScreeningsForHome(supabase);
  if (homeError) {
    console.error('[home] screenings unavailable:', homeError.message);
  } else {
    screeningsRaw = data;
  }

  const ids = (screeningsRaw ?? []).map((s) => s.id);
  const altLocaleById = await fetchScreeningAltLocaleByIds(supabase, ids);
  const reservationCounts: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: resList } = await supabase
      .from('reservations')
      .select('screening_id')
      .in('screening_id', ids);
    for (const r of resList ?? []) {
      const sid = (r as { screening_id: string }).screening_id;
      reservationCounts[sid] = (reservationCounts[sid] ?? 0) + 1;
    }
  }

  const screenings = (screeningsRaw ?? []).map((s) => {
    const rooms = s.rooms as { furniture_json?: unknown } | { furniture_json?: unknown }[] | null;
    const room = Array.isArray(rooms) ? rooms[0] : rooms;
    const furniture = (room?.furniture_json as FurniturePiece[] | null) ?? [];
    const totalSeats = roomCapacity(furniture);
    const reservedCount = reservationCounts[s.id] ?? 0;
    const row = s as {
      year?: number | null;
      director?: string | null;
      duration_minutes?: number | null;
      douban_url?: string | null;
      letterboxd_url?: string | null;
      trailer_url?: string | null;
    };
    const alt = altLocaleById[s.id];
    return {
      id: s.id,
      title: s.title,
      title_en: alt?.title_en ?? undefined,
      screening_at: s.screening_at,
      description: s.description ?? undefined,
      room_id: s.room_id ?? undefined,
      year: row.year ?? undefined,
      director: row.director ?? undefined,
      director_en: alt?.director_en ?? undefined,
      duration_minutes: row.duration_minutes ?? undefined,
      douban_url: row.douban_url ?? undefined,
      letterboxd_url: row.letterboxd_url ?? undefined,
      trailer_url: row.trailer_url ?? undefined,
      reservedCount,
      totalSeats: totalSeats > 0 ? totalSeats : undefined,
    };
  });

  const { open: openId } = await searchParams;

  const initialScreeningId =
    (openId && screenings.some((s) => s.id === openId) ? openId : null) ??
    screenings[0]?.id ??
    null;
  const initialSeatmapById: Record<string, SeatmapApiPayload> = {};
  if (initialScreeningId) {
    const seatmapClient = createAdminClient() ?? supabase;
    const payload = await loadSeatmapPayload(seatmapClient, initialScreeningId);
    if (payload) initialSeatmapById[initialScreeningId] = payload;
  }

  return (
    <main>
      <HomeSection
        screenings={screenings}
        openId={openId ?? null}
        initialSeatmapById={initialSeatmapById}
      />
    </main>
  );
}
