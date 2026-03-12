export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createClient } from '@/lib/supabase/server';
import { roomCapacity } from '@/lib/furniture';
import type { FurniturePiece } from '@/lib/furniture';
import HomeSection from '@/components/HomeSection';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  const supabase = await createClient();
  const { data: screeningsRaw } = await supabase
    .from('screenings')
    .select('id, title, screening_at, description, room_id, year, director, duration_minutes, rooms(furniture_json)')
    .eq('is_active', true)
    .gte('screening_at', new Date().toISOString())
    .order('screening_at', { ascending: true });

  const ids = (screeningsRaw ?? []).map((s) => s.id);
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
    const row = s as { year?: number | null; director?: string | null; duration_minutes?: number | null };
    return {
      id: s.id,
      title: s.title,
      screening_at: s.screening_at,
      description: s.description ?? undefined,
      room_id: s.room_id ?? undefined,
      year: row.year ?? undefined,
      director: row.director ?? undefined,
      duration_minutes: row.duration_minutes ?? undefined,
      reservedCount,
      totalSeats: totalSeats > 0 ? totalSeats : undefined,
    };
  });

  const { open: openId } = await searchParams;

  return (
    <main>
      <HomeSection screenings={screenings} openId={openId ?? null} />
    </main>
  );
}
