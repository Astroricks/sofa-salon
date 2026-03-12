'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/components/LocaleProvider';
import type { FurniturePiece, Decoration } from '@/lib/furniture';
import SeatMap from '@/components/SeatMap';

interface Props {
  screeningId: string;
  roomId?: string | null;
}

export default function SeatMapInline({ screeningId, roomId }: Props) {
  const { t } = useLocale();
  const [data, setData] = useState<{
    room: { furniture: FurniturePiece[]; decorations: Decoration[]; canvasW: number; canvasH: number } | null;
    reservations: unknown[];
    waitlist: unknown[];
    user: { id: string } | null;
    profile: { wechat_id: string | null; is_admin?: boolean } | null;
    squeezeNote: string | null;
    waitlistMode: 'auto' | 'manual';
    screeningTitle: string;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const [
        { data: screening },
        { data: reservations },
        { data: waitlist },
        { data: profileData },
      ] = await Promise.all([
        supabase
          .from('screenings')
          .select('title, squeeze_note, waitlist_mode, rooms(furniture_json, decorations_json, canvas_w, canvas_h)')
          .eq('id', screeningId)
          .single(),
        supabase
          .from('reservations')
          .select('id, seat_key, user_id, is_squeezed, is_ghost, ghost_name, ghost_avatar, profiles(display_name, avatar_config, wechat_id)')
          .eq('screening_id', screeningId),
        supabase
          .from('waitlist')
          .select('id, position, user_id, profiles(display_name, avatar_config)')
          .eq('screening_id', screeningId)
          .eq('status', 'waiting')
          .order('position', { ascending: true }),
        user
          ? supabase.from('profiles').select('wechat_id, is_admin').eq('id', user.id).single()
          : Promise.resolve({ data: null }),
      ]);
      const profile = profileData ?? null;

      const r = screening?.rooms;
      const roomRaw = Array.isArray(r) ? r[0] : r;
      const raw = roomRaw as {
        furniture_json?: unknown;
        decorations_json?: unknown;
        canvas_w?: number;
        canvas_h?: number;
      } | undefined;

      const room = raw
        ? {
            furniture: (Array.isArray(raw.furniture_json)
              ? raw.furniture_json
              : JSON.parse(typeof raw.furniture_json === 'string' ? raw.furniture_json : '[]')) as FurniturePiece[],
            decorations: (Array.isArray(raw.decorations_json)
              ? raw.decorations_json
              : JSON.parse(typeof raw.decorations_json === 'string' ? raw.decorations_json : '[]')) as Decoration[],
            canvasW: raw.canvas_w ?? 600,
            canvasH: raw.canvas_h ?? 400,
          }
        : null;

      setData({
        room,
        reservations: reservations ?? [],
        waitlist: waitlist ?? [],
        user: user ? { id: user.id } : null,
        profile,
        squeezeNote: (screening as { squeeze_note?: string | null })?.squeeze_note ?? null,
        waitlistMode: ((screening as { waitlist_mode?: string | null })?.waitlist_mode as 'auto' | 'manual') ?? 'auto',
        screeningTitle: (screening as { title?: string })?.title ?? '',
      });
    }
    load();
  }, [screeningId]);

  if (!data) {
    return (
      <div style={{ padding: '16px 0' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 48,
              background: '#161616',
              border: '1px solid #2a2a2a',
              marginBottom: 8,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(90deg, transparent, rgba(232,200,74,0.03), transparent)',
                animation: 'shimmer 1.5s infinite',
              }}
            />
          </div>
        ))}
        <style>{`
          @keyframes shimmer {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  if (!data.room) {
    return (
      <p className="film-meta" style={{ padding: '24px 0', textAlign: 'center' }}>
        {t.seatMap.noRoom}
      </p>
    );
  }

  return (
    <SeatMap
      screeningId={screeningId}
      screeningTitle={data.screeningTitle}
      room={data.room}
      squeezeNote={data.squeezeNote}
      initialReservations={data.reservations as Parameters<typeof SeatMap>[0]['initialReservations']}
      initialWaitlist={data.waitlist as Parameters<typeof SeatMap>[0]['initialWaitlist']}
      waitlistMode={data.waitlistMode}
      currentUser={data.user}
      currentUserProfile={data.profile}
      isAdmin={data.profile?.is_admin === true}
    />
  );
}
