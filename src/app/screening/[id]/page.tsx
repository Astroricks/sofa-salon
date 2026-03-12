import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import SeatMap from '@/components/SeatMap';
import GhostSeatManager from '@/components/GhostSeatManager';
import ScreeningRedirect from '@/components/ScreeningRedirect';

export default async function ScreeningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: screening }, { data: { user } }] = await Promise.all([
    supabase
      .from('screenings')
      .select(`
        id,
        title,
        screening_at,
        squeeze_note,
        waitlist_mode,
        room_id,
        rooms (
          name,
          furniture_json,
          decorations_json,
          canvas_w,
          canvas_h
        )
      `)
      .eq('id', id)
      .single(),
    supabase.auth.getUser(),
  ]);

  if (!screening) notFound();
  const roomsRaw = screening.rooms;
  const roomData = Array.isArray(roomsRaw) ? roomsRaw[0] : roomsRaw;
  if (!roomData) {
    notFound();
  }

  const room = roomData as {
    name: string;
    furniture_json: unknown;
    decorations_json: unknown;
    canvas_w: number;
    canvas_h: number;
  };
  const furniture = (room.furniture_json as Array<unknown>) ?? [];
  const decorations = (room.decorations_json as Array<unknown>) ?? [];

  const [
    { data: userProfile },
    { data: reservations },
    { data: waitlist },
  ] = await Promise.all([
    user
      ? supabase.from('profiles').select('wechat_id, is_admin').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('reservations')
      .select('id, seat_key, user_id, is_squeezed, is_ghost, ghost_name, ghost_avatar, profiles(display_name, avatar_config, wechat_id)')
      .eq('screening_id', id),
    supabase
      .from('waitlist')
      .select('id, position, user_id, profiles(display_name, avatar_config)')
      .eq('screening_id', id)
      .eq('status', 'waiting')
      .order('position', { ascending: true }),
  ]);
  const isAdmin = userProfile?.is_admin === true;

  const dateStr = new Date(screening.screening_at).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <ScreeningRedirect screeningId={id}>
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 safe-area-inset-bottom bg-[#0f0f0f]">
      <Link
        href="/"
        className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] hover:text-[#e8c84a] mb-4 inline-block transition-colors"
      >
        {t.screening.back}
      </Link>
      <h1 className="font-pixel-cjk text-xl md:text-2xl text-[#e8c84a] mb-0.5">
        {room.name} — {dateStr}
      </h1>
      <p className="font-pixel-cjk text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-6">
        {screening.title} · {t.screening.tapToClaim}
      </p>
      {isAdmin && (
        <div className="mb-4">
          <GhostSeatManager
            screeningId={screening.id}
            ghosts={((reservations ?? []) as unknown as Array<{ is_ghost?: boolean; seat_key: string; ghost_name: string | null; ghost_avatar: unknown }>)
              .filter((r) => r.is_ghost === true)
              .map((r) => ({
                seat_key: r.seat_key,
                ghost_name: r.ghost_name ?? null,
                ghost_avatar: r.ghost_avatar,
              }))}
          />
        </div>
      )}
      <div className="border border-[#e8c84a] bg-[#0f0f0f] p-4 md:p-6" style={{ borderRadius: 0 }}>
        <SeatMap
          screeningId={screening.id}
          screeningTitle={screening.title}
          room={{
            furniture: furniture as Parameters<typeof SeatMap>[0]['room']['furniture'],
            decorations: decorations as Parameters<typeof SeatMap>[0]['room']['decorations'],
            canvasW: room.canvas_w ?? 600,
            canvasH: room.canvas_h ?? 400,
          }}
          squeezeNote={screening.squeeze_note}
          initialReservations={(reservations ?? []) as unknown as Parameters<typeof SeatMap>[0]['initialReservations']}
          initialWaitlist={(waitlist ?? []) as unknown as Parameters<typeof SeatMap>[0]['initialWaitlist']}
          waitlistMode={(screening.waitlist_mode as 'auto' | 'manual') ?? 'auto'}
          currentUser={user ? { id: user.id } : null}
          currentUserProfile={userProfile ? { wechat_id: userProfile.wechat_id } : null}
          isAdmin={isAdmin}
        />
      </div>
    </div>
    </ScreeningRedirect>
  );
}
