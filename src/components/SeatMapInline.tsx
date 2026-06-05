'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/components/LocaleProvider';
import { screeningDisplayTitle } from '@/lib/screening-display';
import type { FurniturePiece, Decoration } from '@/lib/furniture';
import {
  fetchSeatmapPayload,
  getCachedSeatmap,
  type SeatmapApiPayload,
} from '@/lib/seatmap-client-cache';
import SeatMap from '@/components/SeatMap';

interface Props {
  screeningId: string;
  roomId?: string | null;
}

type SeatmapData = {
  room: { furniture: FurniturePiece[]; decorations: Decoration[]; canvasW: number; canvasH: number } | null;
  reservations: unknown[];
  waitlist: unknown[];
  user: { id: string } | null;
  profile: { wechat_id: string | null; is_admin?: boolean; no_show_count?: number } | null;
  squeezeNote: string | null;
  waitlistMode: 'auto' | 'manual';
  filmTitle: string;
  filmTitleEn: string | null;
};

function payloadToData(
  payload: SeatmapApiPayload,
  user: { id: string } | null,
  profile: SeatmapData['profile']
): SeatmapData {
  const room = payload.room as SeatmapData['room'];
  const filmTitle = payload.filmTitle ?? payload.screeningTitle ?? '';
  const filmTitleEn = payload.filmTitleEn ?? null;
  return {
    room,
    reservations: payload.reservations ?? [],
    waitlist: payload.waitlist ?? [],
    user,
    profile,
    squeezeNote: payload.squeezeNote ?? null,
    waitlistMode: (payload.waitlistMode as 'auto' | 'manual') ?? 'auto',
    filmTitle,
    filmTitleEn,
  };
}

function SeatmapSkeleton() {
  return (
    <div className="seatmap-loading-skeleton" style={{ padding: '16px 0' }}>
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

export default function SeatMapInline({ screeningId }: Props) {
  const { t, locale } = useLocale();
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<SeatmapData | null>(() => {
    const cached = getCachedSeatmap(screeningId);
    return cached ? payloadToData(cached, null, null) : null;
  });

  useEffect(() => {
    const cached = getCachedSeatmap(screeningId);
    if (cached) {
      setData((prev) =>
        payloadToData(cached, prev?.user ?? null, prev?.profile ?? null)
      );
    } else {
      setData(null);
    }

    const ac = new AbortController();
    const supabase = createClient();
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const [payload, profileRes] = await Promise.all([
          fetchSeatmapPayload(screeningId, { signal: ac.signal, force: true }),
          user
            ? supabase
                .from('profiles')
                .select('wechat_id, is_admin, no_show_count')
                .eq('id', user.id)
                .single()
            : Promise.resolve({ data: null }),
        ]);
        if (ac.signal.aborted) return;

        const profile = (profileRes as { data: unknown }).data as SeatmapData['profile'];

        if (!payload) {
          setData({
            room: null,
            reservations: [],
            waitlist: [],
            user: user ? { id: user.id } : null,
            profile,
            squeezeNote: null,
            waitlistMode: 'auto',
            filmTitle: '',
            filmTitleEn: null,
          });
          return;
        }

        setData(payloadToData(payload, user ? { id: user.id } : null, profile));
      } catch {
        // aborted or network error — keep cached UI if any
      }
    }

    void load();
    return () => ac.abort();
  }, [screeningId, refreshKey]);

  const refetchReservations = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  if (!data) {
    return <SeatmapSkeleton />;
  }

  if (!data.room) {
    return (
      <p className="film-meta" style={{ padding: '24px 0', textAlign: 'center' }}>
        {t.seatMap.noRoom}
      </p>
    );
  }

  const screeningTitle = screeningDisplayTitle(locale, data.filmTitle, data.filmTitleEn);

  return (
    <SeatMap
      key={screeningId}
      screeningId={screeningId}
      screeningTitle={screeningTitle}
      room={data.room}
      squeezeNote={data.squeezeNote}
      initialReservations={
        data.reservations as Parameters<typeof SeatMap>[0]['initialReservations']
      }
      initialWaitlist={data.waitlist as Parameters<typeof SeatMap>[0]['initialWaitlist']}
      waitlistMode={data.waitlistMode}
      currentUser={data.user}
      currentUserProfile={data.profile}
      isAdmin={false}
      skipInitialReservationFetch
      onReservationsChange={refetchReservations}
    />
  );
}
