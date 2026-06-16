/**
 * Receipt page: server-rendered viewing receipt for the current user.
 * Fetches past reservations with screening + rating data, builds ReceiptData,
 * renders ReceiptSVG and ReceiptExportButton (export as PNG).
 */
import { noShowScreeningIds } from '@/lib/attendance';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getT, localeFromValue } from '@/lib/i18n';
import ReceiptSVG from '@/components/ReceiptSVG';
import ReceiptExportButton from './ReceiptExportButton';

export type ReceiptFilm = {
  title: string;
  director: string;
  year: number | null;
  durationMinutes: number | null;
  screeningAt: string;
  seatKey: string;
  rating: number | null;
};

export type ReceiptData = {
  displayName: string;
  films: ReceiptFilm[];
  totalScreenings: number;
  totalMinutes: number;
  avgRating: number | null;
  timesBailed: number;
  receiptNumber: string;
  generatedAt: string;
};

function hashToReceiptNumber(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return String((h % 1000000) + 1000000).slice(1);
}

export default async function ReceiptPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const t = getT(localeFromValue(cookieStore.get('sofa-salon-locale')?.value));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login?redirect=/receipt');
  }

  const [profileRes, reservationsRes, ratingsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, no_show_count')
      .eq('id', user.id)
      .single(),
    supabase
      .from('reservations')
      .select(
        'screening_id, seat_key, attended, is_ghost, screenings(id, title, director, year, duration_minutes, screening_at)'
      )
      .eq('user_id', user.id),
    supabase
      .from('screening_ratings')
      .select('screening_id, rating')
      .eq('user_id', user.id),
  ]);

  const profile = profileRes.data;
  const reservations = reservationsRes.data ?? [];
  const ratingsMap = new Map(
    (ratingsRes.data ?? []).map((r: { screening_id: string; rating: number }) => [
      r.screening_id,
      r.rating,
    ])
  );

  type Row = {
    screening_id: string;
    seat_key?: string | null;
    attended?: boolean | null;
    is_ghost?: boolean | null;
    screenings:
      | {
          id: string;
          title: string | null;
          director?: string | null;
          year?: number | null;
          duration_minutes?: number | null;
          screening_at: string;
        }[]
      | {
          id: string;
          title: string | null;
          director?: string | null;
          year?: number | null;
          duration_minutes?: number | null;
          screening_at: string;
        }
      | null;
  };

  const now = Date.now();
  const films: ReceiptFilm[] = [];
  const hiddenNoShowIds = noShowScreeningIds(reservations as Row[]);

  for (const r of reservations as Row[]) {
    const s = Array.isArray(r.screenings) ? r.screenings[0] : r.screenings;
    if (!s?.id || !s.screening_at) continue;
    if (hiddenNoShowIds.has(s.id)) continue;
    const screeningAt = s.screening_at;
    if (new Date(screeningAt).getTime() >= now) continue;
    films.push({
      title: s.title ?? '',
      director: s.director ?? '',
      year: s.year ?? null,
      durationMinutes: s.duration_minutes ?? null,
      screeningAt,
      seatKey: r.seat_key ?? '',
      rating: ratingsMap.get(s.id) ?? null,
    });
  }

  films.sort((a, b) => new Date(b.screeningAt).getTime() - new Date(a.screeningAt).getTime());

  const totalMinutes = films.reduce((acc, f) => acc + (f.durationMinutes ?? 0), 0);
  const rated = films.filter((f) => f.rating != null);
  const avgRating =
    rated.length > 0
      ? Math.round((rated.reduce((a, f) => a + (f.rating ?? 0), 0) / rated.length) * 10) / 10
      : null;

  const receiptNumber = hashToReceiptNumber(user.id);
  const generatedAt = new Date().toISOString();

  const data: ReceiptData = {
    displayName: profile?.display_name ?? t.receipt.guest,
    films,
    totalScreenings: films.length,
    totalMinutes,
    avgRating,
    timesBailed: profile?.no_show_count ?? 0,
    receiptNumber,
    generatedAt,
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-[960px] flex flex-col items-center">
        <ReceiptSVG data={data} />
        <ReceiptExportButton />
      </div>
    </div>
  );
}
