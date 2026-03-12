'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  FurniturePiece,
  Decoration,
  getSeatPositions,
  getSqueezePositions,
  roomCapacity,
  roomCapacityWithSqueeze,
  canSqueeze,
  getFurnitureFocusBox,
} from '@/lib/furniture';
import { jsonToConfig } from '@/lib/avatar';
import FurnitureSVG from '@/components/FurnitureSVG';
import DecorationSVG from '@/components/DecorationSVG';
import AvatarSVG from '@/components/AvatarSVG';
import ClaimModal from '@/components/ClaimModal';
import SqueezeModal from '@/components/SqueezeModal';
import { useLocale } from '@/components/LocaleProvider';
import { useRouter } from 'next/navigation';

interface Reservation {
  id: string;
  seat_key: string;
  user_id: string;
  is_squeezed: boolean;
  is_ghost?: boolean;
  ghost_name?: string | null;
  ghost_avatar?: unknown;
  profiles: { display_name: string; avatar_config: unknown; wechat_id?: string | null } | null;
}

interface WaitlistEntry {
  id: string;
  position: number;
  user_id: string;
  profiles: { display_name: string; avatar_config: unknown };
}

interface SeatMapProps {
  screeningId: string;
  screeningTitle: string;
  room: {
    furniture: FurniturePiece[];
    decorations: Decoration[];
    canvasW: number;
    canvasH: number;
  };
  squeezeNote: string | null;
  initialReservations: Reservation[];
  initialWaitlist: WaitlistEntry[];
  waitlistMode: 'auto' | 'manual';
  currentUser: { id: string } | null;
  currentUserProfile: { wechat_id: string | null } | null;
  isAdmin?: boolean;
}

export default function SeatMap({
  screeningId,
  screeningTitle,
  room,
  squeezeNote,
  initialReservations,
  initialWaitlist,
  waitlistMode,
  currentUser,
  currentUserProfile,
  isAdmin = false,
}: SeatMapProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>(initialWaitlist);

  useEffect(() => {
    setReservations(initialReservations);
  }, [initialReservations]);
  useEffect(() => {
    setWaitlistEntries(initialWaitlist);
  }, [initialWaitlist]);
  const [pendingSeat, setPendingSeat] = useState<string | null>(null);
  const [pendingSqueeze, setPendingSqueeze] = useState<string | null>(null);
  const [adminDetailReservation, setAdminDetailReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const furnitureFocusBox = useMemo(
    () =>
      getFurnitureFocusBox(
        room.furniture,
        room.decorations,
        room.canvasW,
        room.canvasH,
        32
      ),
    [room.furniture, room.decorations, room.canvasW, room.canvasH]
  );

  useEffect(() => {
    const update = () =>
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.offsetWidth;
      if (isMobile && furnitureFocusBox) {
        setScale(width / furnitureFocusBox.w);
        setOffsetX(furnitureFocusBox.minX);
        setOffsetY(furnitureFocusBox.minY);
      } else {
        setScale(width / room.canvasW);
        setOffsetX(0);
        setOffsetY(0);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [room.canvasW, isMobile, furnitureFocusBox]);

  const pendingReservationsUpdate = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWaitlistUpdate = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function fetchReservations() {
      const select = isAdmin
        ? 'id, seat_key, user_id, is_squeezed, is_ghost, ghost_name, ghost_avatar, profiles(display_name, avatar_config, wechat_id)'
        : 'id, seat_key, user_id, is_squeezed, is_ghost, ghost_name, ghost_avatar, profiles(display_name, avatar_config)';
      const { data } = await supabase
        .from('reservations')
        .select(select)
        .eq('screening_id', screeningId);
      setReservations((data as unknown as Reservation[]) ?? []);
    }
    async function fetchWaitlist() {
      const { data } = await supabase
        .from('waitlist')
        .select('id, position, user_id, profiles(display_name, avatar_config)')
        .eq('screening_id', screeningId)
        .eq('status', 'waiting')
        .order('position', { ascending: true });
      setWaitlistEntries((data as unknown as WaitlistEntry[]) ?? []);
    }

    const ch1 = supabase
      .channel(`reservations:${screeningId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `screening_id=eq.${screeningId}`,
        },
        () => {
          if (pendingReservationsUpdate.current) clearTimeout(pendingReservationsUpdate.current);
          pendingReservationsUpdate.current = setTimeout(() => {
            pendingReservationsUpdate.current = null;
            fetchReservations();
          }, 300);
        }
      )
      .subscribe();

    const ch2 = supabase
      .channel(`waitlist:${screeningId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waitlist',
          filter: `screening_id=eq.${screeningId}`,
        },
        () => {
          if (pendingWaitlistUpdate.current) clearTimeout(pendingWaitlistUpdate.current);
          pendingWaitlistUpdate.current = setTimeout(() => {
            pendingWaitlistUpdate.current = null;
            fetchWaitlist();
          }, 300);
        }
      )
      .subscribe();

    return () => {
      if (pendingReservationsUpdate.current) clearTimeout(pendingReservationsUpdate.current);
      if (pendingWaitlistUpdate.current) clearTimeout(pendingWaitlistUpdate.current);
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [screeningId, isAdmin]);

  const totalNormalSeats = room.furniture.reduce(
    (s, f) => s + getSeatPositions(f).length,
    0
  );
  const totalSqueezeSeats = room.furniture
    .filter(canSqueeze)
    .reduce((s, f) => s + f.squeezeExtra, 0);
  const takenNormal = reservations.filter((r) => !r.is_squeezed).length;
  const takenSqueeze = reservations.filter((r) => r.is_squeezed).length;
  const allFull =
    takenNormal >= totalNormalSeats && takenSqueeze >= totalSqueezeSeats;

  function showSqueezeFor(piece: FurniturePiece): boolean {
    if (!canSqueeze(piece) || piece.squeezeExtra === 0) return false;
    const normalTaken = reservations.filter(
      (r) =>
        r.seat_key.startsWith(`${piece.id}:`) &&
        !r.seat_key.includes('squeeze') &&
        !r.is_squeezed
    ).length;
    return normalTaken >= piece.seats;
  }

  const myReservation = reservations.find(
    (r) => r.user_id === currentUser?.id && !r.is_ghost
  );
  const myWaitlistEntry = waitlistEntries.find(
    (e) => e.user_id === currentUser?.id
  );
  const wechatFilled =
    currentUserProfile?.wechat_id != null &&
    String(currentUserProfile.wechat_id).trim() !== '';

  const openClaim = (seatKey: string) => {
    if (!currentUser) {
      router.push(`/auth/login?redirect=${encodeURIComponent(`/screening/${screeningId}`)}`);
      return;
    }
    if (!wechatFilled) {
      router.push('/profile/setup');
      return;
    }
    setPendingSeat(seatKey);
  };

  const openSqueeze = (seatKey: string) => {
    if (!currentUser) {
      router.push(`/auth/login?redirect=${encodeURIComponent(`/screening/${screeningId}`)}`);
      return;
    }
    if (!wechatFilled) {
      router.push('/profile/setup');
      return;
    }
    setPendingSqueeze(seatKey);
  };

  const claimSeat = async (seatKey: string, isSqueezed = false) => {
    if (!currentUser || myReservation || loading) return;
    setLoading(true);
    const res = await fetch('/api/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screeningId, seatKey, isSqueezed }),
    });
    setLoading(false);
    setPendingSeat(null);
    setPendingSqueeze(null);
    if (res.ok) {
      const data = await res.json();
      if (data.reservation) {
        setReservations((prev) => [...prev, data.reservation]);
      }
    }
  };

  const joinWaitlist = async () => {
    if (!currentUser || myWaitlistEntry || loading) return;
    if (!wechatFilled) {
      router.push('/profile/setup');
      return;
    }
    setLoading(true);
    await fetch('/api/waitlist/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screeningId }),
    });
    setLoading(false);
    const { data } = await createClient()
      .from('waitlist')
      .select('id, position, user_id, profiles(display_name, avatar_config)')
      .eq('screening_id', screeningId)
      .eq('status', 'waiting')
      .order('position', { ascending: true });
    setWaitlistEntries((data as unknown as WaitlistEntry[]) ?? []);
  };

  const allSeats = room.furniture.flatMap((p) => getSeatPositions(p));
  const avatarPx = Math.max(36, Math.round(room.canvasW * 0.06));
  const nameSize = Math.max(9, Math.round(10 * scale));
  const seatTransform = 'translateX(-50%) translateY(-50%)';

  return (
    <div>
      <div className="flex gap-4 font-mono text-[13px] text-[#888888] mb-4 flex-wrap">
        <span>
          <span className="text-[#e8c84a]">{reservations.length}</span> /{' '}
          {roomCapacityWithSqueeze(room.furniture)} {t.screening.seatsTaken}
        </span>
        {squeezeNote && (
          <span className="text-[#444444]">· {squeezeNote}</span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 16 : 24,
          alignItems: isMobile ? 'stretch' : 'flex-start',
        }}
      >
        <div
          ref={containerRef}
          className="relative w-full"
          style={{
            flex: isMobile ? undefined : 1,
            minWidth: 0,
            aspectRatio:
              isMobile && furnitureFocusBox
                ? `${furnitureFocusBox.w}/${furnitureFocusBox.h}`
                : `${room.canvasW}/${room.canvasH}`,
          }}
        >
        <svg
          viewBox={
            isMobile && furnitureFocusBox
              ? `${furnitureFocusBox.minX} ${furnitureFocusBox.minY} ${furnitureFocusBox.w} ${furnitureFocusBox.h}`
              : `0 0 ${room.canvasW} ${room.canvasH}`
          }
          className="absolute inset-0 w-full h-full pixel"
          style={{ imageRendering: 'pixelated' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <rect
            width={room.canvasW}
            height={room.canvasH}
            fill="#2a2218"
          />
          {Array.from({ length: Math.max(1, Math.ceil(room.canvasH / 40)) }, (_, i) => (
            <rect
              key={i}
              x={0}
              y={(i + 1) * 40}
              width={room.canvasW}
              height={1}
              fill="#252015"
            />
          ))}
          {room.decorations.map((d) => (
            <DecorationSVG key={d.id} decoration={d} />
          ))}
          {room.furniture.map((p) => (
            <FurnitureSVG key={p.id} piece={p} />
          ))}
        </svg>

        {/* Layer 1: normal seats */}
        {allSeats.map(({ seatKey, x, y }) => {
          const reservation = reservations.find((r) => r.seat_key === seatKey);
          const isMe = myReservation?.seat_key === seatKey;
          const cssLeft = (x - offsetX) * scale;
          const cssTop = (y - offsetY) * scale;
          const slotW = Math.round(avatarPx * scale);
          const slotH = Math.round(avatarPx * scale * 1.2);

          return (
            <div
              key={seatKey}
              className="absolute flex flex-col items-center"
              style={{
                left: cssLeft,
                top: cssTop,
                transform: seatTransform,
                zIndex: 10,
              }}
            >
              {reservation ? (
                <div
                  role={isAdmin ? 'button' : undefined}
                  tabIndex={isAdmin ? 0 : undefined}
                  onClick={isAdmin ? () => setAdminDetailReservation(reservation) : undefined}
                  onKeyDown={
                    isAdmin
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setAdminDetailReservation(reservation);
                          }
                        }
                      : undefined
                  }
                  className={`flex flex-col items-center relative ${
                    isAdmin ? 'cursor-pointer hover:opacity-90' : isMe ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <AvatarSVG
                    config={
                      reservation.ghost_avatar != null
                        ? jsonToConfig(reservation.ghost_avatar)
                        : jsonToConfig(reservation.profiles?.avatar_config)
                    }
                    size={slotW}
                    pose="sit"
                  />
                  {isAdmin && reservation.is_ghost && (
                    <span
                      className="absolute -top-0.5 -right-0.5 text-[10px] leading-none"
                      title={t.screening.ghostSeat}
                    >
                      👻
                    </span>
                  )}
                  <span
                    className={`font-mono truncate max-w-[60px] leading-none mt-0.5 ${
                      isMe ? 'text-[#e8c84a]' : 'text-[#888888]'
                    }`}
                    style={{ fontSize: nameSize }}
                  >
                    {isMe
                      ? t.screening.you
                      : reservation.ghost_name ?? reservation.profiles?.display_name ?? '—'}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openClaim(seatKey)}
                  disabled={!!myReservation || loading}
                  className="border-2 border-dashed border-[#444444] bg-transparent hover:border-[#e8c84a] flex items-center justify-center text-[#444444] hover:text-[#e8c84a] transition-colors font-mono text-lg disabled:opacity-30 min-w-[44px] min-h-[44px]"
                  style={{
                    width: Math.max(40, slotW),
                    height: Math.max(40, slotH),
                    borderRadius: 0,
                  }}
                  title={seatKey}
                >
                  +
                </button>
              )}
            </div>
          );
        })}

        {/* Layer 2: squeeze slots */}
        {room.furniture.map(
          (piece) =>
            showSqueezeFor(piece) &&
            getSqueezePositions(piece).map(({ seatKey, x, y }) => {
              const reservation = reservations.find((r) => r.seat_key === seatKey);
              const isMe = myReservation?.seat_key === seatKey;
              const cssLeft = (x - offsetX) * scale;
              const cssTop = (y - offsetY) * scale;
              const slotW = Math.round(avatarPx * scale * 0.85);
              const slotH = Math.round(avatarPx * scale * 1.1);

              return (
                <div
                  key={seatKey}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: cssLeft,
                    top: cssTop,
                    transform: seatTransform,
                    zIndex: 11,
                  }}
                >
                  {reservation ? (
                    <div
                      role={isAdmin ? 'button' : undefined}
                      tabIndex={isAdmin ? 0 : undefined}
                      onClick={isAdmin ? () => setAdminDetailReservation(reservation) : undefined}
                      onKeyDown={
                        isAdmin
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setAdminDetailReservation(reservation);
                              }
                            }
                          : undefined
                      }
                      className={`flex flex-col items-center relative ${isAdmin ? 'cursor-pointer hover:opacity-90' : ''}`}
                    >
                      <AvatarSVG
                        config={
                          reservation.ghost_avatar != null
                            ? jsonToConfig(reservation.ghost_avatar)
                            : jsonToConfig(reservation.profiles?.avatar_config)
                        }
                        size={slotW}
                        pose="sit"
                      />
                      {isAdmin && reservation.is_ghost && (
                        <span
                          className="absolute -top-0.5 -right-0.5 text-[10px] leading-none"
                          title={t.screening.ghostSeat}
                        >
                          👻
                        </span>
                      )}
                      <span
                        className="font-mono truncate max-w-[56px] text-[#888888]"
                        style={{ fontSize: nameSize }}
                      >
                        {reservation.ghost_name ?? reservation.profiles?.display_name ?? '—'}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openSqueeze(seatKey)}
                      disabled={!!myReservation || loading}
                      className="border border-dashed border-[#f87171] bg-transparent text-[#f87171] flex items-center justify-center hover:opacity-85 transition-opacity font-mono text-[9px] tracking-[0.15em] uppercase min-w-[40px] min-h-[40px]"
                      style={{
                        width: Math.max(40, slotW),
                        height: Math.max(40, slotH),
                        borderRadius: 0,
                      }}
                    >
                      {t.screening.squeezeButton}
                    </button>
                  )}
                </div>
              );
            })
        )}
        </div>

        {/* Squeeze In + Waiting List: right column on desktop (visible without scrolling), below map on mobile */}
        <div
          className="p-4 border-2 border-dashed border-[#333] bg-[#1a1510] text-center cursor-pointer transition-[border-color] duration-200 hover:border-[#f87171]"
          style={{
            borderRadius: 0,
            width: isMobile ? '100%' : 280,
            flexShrink: 0,
          }}
        >
        <div className="font-mono text-[13px] tracking-[0.2em] text-[#555] transition-colors duration-200 hover:text-[#f87171]">
          {t.screening.squeezeInZone}
        </div>
        <div className="font-mono text-[10px] tracking-[0.2em] text-[#444] mt-0.5">
          {t.screening.squeezeInSub}
        </div>
        {(allFull || waitlistEntries.length > 0) && (
          <>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#c084fc] mt-4 mb-3">
              {t.screening.waitingArea} · {waitlistEntries.length} {t.screening.queued}
            </p>
            <div className="flex gap-3 flex-wrap justify-center mb-3">
              {waitlistEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col items-center gap-1"
                >
                  <AvatarSVG
                    config={jsonToConfig(entry.profiles.avatar_config)}
                    size={40}
                    pose="stand"
                  />
                  <span className="font-mono text-[10px] text-[#444444]">#{entry.position}</span>
                </div>
              ))}
              {allFull && !myWaitlistEntry && !myReservation && (
                <button
                  type="button"
                  onClick={joinWaitlist}
                  className="border-2 border-dashed border-[#c084fc] bg-transparent hover:border-[#c084fc] hover:opacity-90 w-12 h-14 flex items-center justify-center text-[#c084fc] transition-colors font-mono text-xl min-w-[44px] min-h-[44px]"
                  style={{ borderRadius: 0 }}
                >
                  +
                </button>
              )}
            </div>
            {waitlistMode === 'auto' && (
              <p className="font-mono text-[13px] text-[#444444]">
                {t.screening.ifSomeoneCancels}
              </p>
            )}
          </>
        )}
        </div>
      </div>

      <ClaimModal
        open={!!pendingSeat}
        onClose={() => setPendingSeat(null)}
        seatLabel={pendingSeat ?? ''}
        screeningTitle={screeningTitle}
        isMobile={isMobile}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pendingSeat) claimSeat(pendingSeat, false);
          }}
        >
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#e8c84a] text-[#0f0f0f] font-mono text-[10px] tracking-[0.2em] uppercase py-3 min-h-[44px] hover:opacity-85 active:scale-[0.97] disabled:opacity-60 transition-all"
            style={{ borderRadius: 0 }}
          >
            {t.screening.claimThisSeat}
          </button>
        </form>
      </ClaimModal>

      <SqueezeModal
        open={!!pendingSqueeze}
        onClose={() => setPendingSqueeze(null)}
        onConfirm={() => {
          if (pendingSqueeze) claimSeat(pendingSqueeze, true);
        }}
        loading={loading}
        isMobile={isMobile}
      />

      {/* Admin: guest detail modal when clicking a reserved seat */}
      {isAdmin && adminDetailReservation && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
          onClick={() => setAdminDetailReservation(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-guest-detail-title"
        >
          <div
            className="bg-[#0f0f0f] border border-[#e8c84a] p-6 w-full max-w-sm relative"
            style={{ borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setAdminDetailReservation(null)}
              className="absolute top-3 right-3 font-mono text-xl leading-none text-[#888888] hover:text-[#e8c84a] transition-colors"
              aria-label={t.admin.close}
            >
              ×
            </button>
            <h2 id="admin-guest-detail-title" className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-4">
              {t.admin.guestDetail}
            </h2>
            <div className="space-y-3 font-mono text-[13px]">
              <div>
                <span className="text-[#888888]">{t.admin.displayName}</span>
                <p className="text-[#e8e4dc] mt-0.5">
                  {adminDetailReservation.ghost_name ?? adminDetailReservation.profiles?.display_name ?? '—'}
                </p>
              </div>
              <div>
                <span className="text-[#888888]">{t.admin.wechatId}</span>
                <p className="text-[#e8e4dc] mt-0.5 break-all">
                  {adminDetailReservation.profiles?.wechat_id ?? '—'}
                </p>
                {adminDetailReservation.profiles?.wechat_id && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(adminDetailReservation.profiles!.wechat_id!);
                    }}
                    className="mt-2 text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] hover:underline"
                  >
                    {t.admin.copyWechat}
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAdminDetailReservation(null)}
              className="mt-6 w-full border border-[#2a2a2a] text-[#888888] font-mono text-[10px] tracking-[0.2em] uppercase py-3 hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
              style={{ borderRadius: 0 }}
            >
              {t.admin.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
