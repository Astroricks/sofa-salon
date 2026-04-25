'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FurniturePiece, Decoration } from '@/lib/furniture';
import SeatMap from '@/components/SeatMap';
import { fetchAttendanceCounts } from '@/lib/attendance';

interface Props {
  screening: {
    id: string;
    title: string;
    screening_at: string;
    description?: string;
    room_id?: string;
  };
  onClose: () => void;
}

export default function SeatDrawer({ screening, onClose }: Props) {
  const [room, setRoom] = useState<{
    furniture: FurniturePiece[];
    decorations: Decoration[];
    canvasW: number;
    canvasH: number;
  } | null>(null);
  const [reservations, setReservations] = useState<unknown[]>([]);
  const [waitlist, setWaitlist] = useState<unknown[]>([]);
  const [userProfile, setUserProfile] = useState<{
    wechat_id: string | null;
    is_admin?: boolean;
  } | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [squeezeNote, setSqueezeNote] = useState<string | null>(null);
  const [waitlistMode, setWaitlistMode] = useState<'auto' | 'manual'>('auto');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const [
        { data: { user } },
        { data: screeningData },
        { data: reservationsData },
        { data: waitlistData },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from('screenings')
          .select(
            'squeeze_note, waitlist_mode, rooms(furniture_json, decorations_json, canvas_w, canvas_h)'
          )
          .eq('id', screening.id)
          .single(),
        supabase
          .from('reservations')
          .select('id, seat_key, user_id, is_squeezed, is_ghost, ghost_name, ghost_avatar, friend_avatar, profiles(display_name, avatar_config, no_show_count)')
          .eq('screening_id', screening.id),
        supabase
          .from('waitlist')
          .select('id, position, user_id, profiles(display_name, avatar_config)')
          .eq('screening_id', screening.id)
          .eq('status', 'waiting')
          .order('position', { ascending: true }),
      ]);

      setCurrentUser(user ? { id: user.id } : null);
      type ReservationWithProfile = {
        user_id?: string | null;
        profiles?: { attendance_count?: number; [k: string]: unknown } | null;
        [k: string]: unknown;
      };
      const resRows = (reservationsData ?? []) as unknown as ReservationWithProfile[];
      const userIds = Array.from(
        new Set(
          resRows
            .map((r) => r.user_id)
            .filter((u): u is string => typeof u === 'string' && u.length > 0)
        )
      );
      const counts = userIds.length > 0 ? await fetchAttendanceCounts(supabase, userIds) : new Map<string, number>();
      const resWithCounts = resRows.map((r) => ({
        ...r,
        profiles: r.profiles
          ? { ...r.profiles, attendance_count: counts.get(typeof r.user_id === 'string' ? r.user_id : '') ?? 0 }
          : r.profiles,
      }));
      setReservations(resWithCounts);
      setWaitlist(waitlistData ?? []);

      const s = screeningData as {
        squeeze_note?: string | null;
        waitlist_mode?: string | null;
        rooms?: unknown;
      } | null;
      if (s) {
        setSqueezeNote(s.squeeze_note ?? null);
        setWaitlistMode((s.waitlist_mode as 'auto' | 'manual') ?? 'auto');
      }

      if (screeningData?.rooms) {
        const r = Array.isArray(screeningData.rooms)
          ? screeningData.rooms[0]
          : screeningData.rooms;
        if (r) {
          const raw = r as {
            furniture_json?: unknown;
            decorations_json?: unknown;
            canvas_w?: number;
            canvas_h?: number;
          };
          setRoom({
            furniture: (Array.isArray(raw.furniture_json)
              ? raw.furniture_json
              : JSON.parse(
                  typeof raw.furniture_json === 'string'
                    ? raw.furniture_json
                    : '[]'
                )) as FurniturePiece[],
            decorations: (Array.isArray(raw.decorations_json)
              ? raw.decorations_json
              : JSON.parse(
                  typeof raw.decorations_json === 'string'
                    ? raw.decorations_json
                    : '[]'
                )) as Decoration[],
            canvasW: raw.canvas_w ?? 600,
            canvasH: raw.canvas_h ?? 400,
          });
        }
      }

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('wechat_id, is_admin')
          .eq('id', user.id)
          .single();
        setUserProfile(profile ?? null);
      }

      setLoading(false);
    }
    load();
  }, [screening.id]);

  const date = new Date(screening.screening_at);
  const dateStr = date.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  const timeStr = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 40,
        }}
      />

      {/* Drawer panel — slides up from bottom */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          background: '#0f0f0f',
          borderTop: '1px solid #e8c84a',
          maxHeight: '92vh',
          overflowY: 'auto',
          animation: 'slideUp 0.25s ease-out',
        }}
      >
        {/* Drawer header */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            background: '#0f0f0f',
            borderBottom: '1px solid #2a2a2a',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 1,
          }}
        >
          <div>
            <p
              className="font-pixel-cjk"
              style={{
                fontSize: 11,
                color: '#e8e4dc',
                lineHeight: 1.6,
                marginBottom: 2,
              }}
            >
              {screening.title}
            </p>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: '#888',
                letterSpacing: 1,
              }}
            >
              {dateStr} · {timeStr}
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 18,
              color: '#888',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Drawer content */}
        <div style={{ padding: '16px 12px 48px' }}>
          {loading ? (
            <div
              style={{
                padding: '48px 0',
                textAlign: 'center',
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                color: '#444',
              }}
            >
              Loading · 加载中
              <span style={{ animation: 'pulse 1s infinite' }}>...</span>
            </div>
          ) : room ? (
            <SeatMap
              screeningId={screening.id}
              screeningTitle={screening.title}
              room={room}
              squeezeNote={squeezeNote}
              initialReservations={reservations as Parameters<typeof SeatMap>[0]['initialReservations']}
              initialWaitlist={waitlist as Parameters<typeof SeatMap>[0]['initialWaitlist']}
              waitlistMode={waitlistMode}
              currentUser={currentUser}
              currentUserProfile={userProfile}
              isAdmin={userProfile?.is_admin === true}
            />
          ) : (
            <div
              style={{
                padding: '48px 0',
                textAlign: 'center',
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                color: '#444',
              }}
            >
              No room layout configured for this event.
            </div>
          )}
        </div>
      </div>

    </>
  );
}
