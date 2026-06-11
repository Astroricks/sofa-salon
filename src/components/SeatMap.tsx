'use client';

import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
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
  seatKeyToDisplayLabel,
  ROOM_BACKGROUND_PRESETS,
} from '@/lib/furniture';
import { jsonToConfig, avatarConfigFromSeed } from '@/lib/avatar';
import FurnitureSVG from '@/components/FurnitureSVG';
import DecorationSVG from '@/components/DecorationSVG';
import AvatarSVG from '@/components/AvatarSVG';
import PigeonIcon from '@/components/PigeonIcon';
import BloodBar from '@/components/BloodBar';
import ClaimModal from '@/components/ClaimModal';
import SqueezeModal from '@/components/SqueezeModal';
import { useLocale } from '@/components/LocaleProvider';
import { useRouter } from 'next/navigation';
import { getBadgeLevel } from '@/lib/badges';
import { fetchAttendanceCounts } from '@/lib/attendance';
import {
  adminContactFieldLabel,
  getProfileContact,
  hasProfileContact,
} from '@/lib/contact-platform';

interface Reservation {
  id: string;
  seat_key: string;
  user_id: string;
  is_squeezed: boolean;
  is_ghost?: boolean;
  ghost_name?: string | null;
  ghost_avatar?: unknown;
  friend_avatar?: unknown;
  created_at?: string | null;
  profiles: {
    display_name: string;
    avatar_config: unknown;
    wechat_id?: string | null;
    contact_platform?: string | null;
    contact_id?: string | null;
    no_show_count?: number;
    attendance_count?: number;
  } | null;
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
    /** 房间背景预设 id，由 host 在「修改房间」中设置 */
    roomBackgroundId?: string | null;
  };
  squeezeNote: string | null;
  initialReservations: Reservation[];
  initialWaitlist: WaitlistEntry[];
  waitlistMode: 'auto' | 'manual';
  currentUser: { id: string } | null;
  currentUserProfile: {
    wechat_id: string | null;
    contact_platform?: string | null;
    contact_id?: string | null;
    no_show_count?: number;
  } | null;
  isAdmin?: boolean;
  /** When true (e.g. ?testSqueeze=1 for admin), show squeeze slots even when not full so admin can test 挤一挤 */
  testSqueeze?: boolean;
  /** When provided (e.g. by SeatMapInline), called after reserve success or seat-already-taken so parent can refetch data */
  onReservationsChange?: () => void | Promise<void>;
  /** Home inline map: seatmap API already includes reservations + attendance counts */
  skipInitialReservationFetch?: boolean;
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
  testSqueeze = false,
  onReservationsChange,
  skipInitialReservationFetch = false,
}: SeatMapProps) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const isZh = locale === 'zh';
  const roomBackgroundId = room.roomBackgroundId ?? 'warm';
  const roomBgPreset = useMemo(
    () => ROOM_BACKGROUND_PRESETS.find((p) => p.id === roomBackgroundId) ?? ROOM_BACKGROUND_PRESETS[0],
    [roomBackgroundId]
  );
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>(initialWaitlist);

  useEffect(() => {
    setReservations(initialReservations);
  }, [initialReservations]);
  useEffect(() => {
    setWaitlistEntries(initialWaitlist);
  }, [initialWaitlist]);

  // Reset selection UI when switching to a different screening (e.g. another movie)
  useEffect(() => {
    setPendingSeatKeys([]);
    setCancelSelection(new Set());
    setConfirmMultiOpen(false);
    setWaitlistJoinModalOpen(false);
    setCancelModalReservations(null);
    setPendingSqueeze(null);
    setAdminDetailReservation(null);
    setGuestPeekReservation(null);
    setSeatError(null);
  }, [screeningId]);

  const MAX_PENDING_SEATS = 10;
  const [pendingSeatKeys, setPendingSeatKeys] = useState<string[]>([]);
  const [confirmMultiOpen, setConfirmMultiOpen] = useState(false);
  const [waitlistJoinModalOpen, setWaitlistJoinModalOpen] = useState(false);
  const [pendingSqueeze, setPendingSqueeze] = useState<string | null>(null);
  const [adminDetailReservation, setAdminDetailReservation] = useState<Reservation | null>(null);
  const [guestPeekReservation, setGuestPeekReservation] = useState<Reservation | null>(null);

  const [cancelSelection, setCancelSelection] = useState<Set<string>>(new Set());
  const cancelSelectionRef = useRef<Set<string>>(cancelSelection);
  cancelSelectionRef.current = cancelSelection;
  const [cancelModalReservations, setCancelModalReservations] = useState<Reservation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelEasterEgg, setShowCancelEasterEgg] = useState(false);
  const [pendingCancelListEasterEgg, setPendingCancelListEasterEgg] = useState<Reservation[]>([]);
  const YOUTUBE_SHORTS_EMBED = 'https://www.youtube.com/embed/Gd5YJUGlOdg';
  const [seatError, setSeatError] = useState<string | null>(null);
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
      const height = containerRef.current.offsetHeight;
      if (furnitureFocusBox) {
        // Zoom to furniture bounds on both mobile and desktop: center the room and make it larger
        const scaleByWidth = width / furnitureFocusBox.w;
        const scaleByHeight = height / furnitureFocusBox.h;
        const s = Math.min(scaleByWidth, scaleByHeight);
        setScale(s);
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
  }, [room.canvasW, furnitureFocusBox]);

  const pendingReservationsUpdate = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWaitlistUpdate = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchWaitlist = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('waitlist')
      .select('id, position, user_id, profiles(display_name, avatar_config)')
      .eq('screening_id', screeningId)
      .eq('status', 'waiting')
      .order('position', { ascending: true });
    setWaitlistEntries((data as unknown as WaitlistEntry[]) ?? []);
  }, [screeningId]);

  useEffect(() => {
    const supabase = createClient();

    async function fetchReservations() {
      const select = isAdmin
        ? 'id, seat_key, user_id, is_squeezed, is_ghost, ghost_name, ghost_avatar, friend_avatar, created_at, profiles(display_name, avatar_config, wechat_id, contact_platform, contact_id, no_show_count)'
        : 'id, seat_key, user_id, is_squeezed, is_ghost, ghost_name, ghost_avatar, friend_avatar, created_at, profiles(display_name, avatar_config, no_show_count)';
      const { data } = await supabase
        .from('reservations')
        .select(select)
        .eq('screening_id', screeningId);
      const rows = (data as unknown as Reservation[]) ?? [];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter((u): u is string => typeof u === 'string' && u.length > 0)));
      const counts = userIds.length > 0 ? await fetchAttendanceCounts(supabase, userIds) : new Map<string, number>();
      const withCounts: Reservation[] = rows.map((r) => ({
        ...r,
        profiles: r.profiles
          ? { ...r.profiles, attendance_count: counts.get(r.user_id) ?? 0 }
          : r.profiles,
      }));
      setReservations(withCounts);
    }

    if (!skipInitialReservationFetch) {
      // SSR / dedicated screening page: refresh once (RPC attendance may differ).
      void fetchReservations();
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
            if (onReservationsChange) onReservationsChange();
            else fetchReservations();
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
            if (onReservationsChange) onReservationsChange();
            else fetchWaitlist();
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
  }, [screeningId, isAdmin, onReservationsChange, fetchWaitlist, skipInitialReservationFetch]);

  const allSeatKeys = useMemo(
    () =>
      room.furniture.flatMap((p) => [
        ...getSeatPositions(p).map((s) => s.seatKey),
        ...getSqueezePositions(p).map((s) => s.seatKey),
      ]),
    [room.furniture]
  );
  const takenSeatKeys = useMemo(
    () => new Set(reservations.map((r) => r.seat_key)),
    [reservations]
  );
  const availableSeatKeys = useMemo(
    () => allSeatKeys.filter((k) => !takenSeatKeys.has(k)),
    [allSeatKeys, takenSeatKeys]
  );

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

  /** True if any reservation is on this piece's squeeze slots (so admin can show them without testSqueeze). */
  function hasSqueezeReservationOnPiece(piece: FurniturePiece): boolean {
    return reservations.some((r) => r.seat_key.startsWith(`${piece.id}:squeeze:`));
  }

  const showSqueezeLayer = !isAdmin || testSqueeze || (isAdmin && reservations.some((r) => r.is_squeezed));

  const myReservations = reservations.filter(
    (r) => r.user_id === currentUser?.id && !r.is_ghost
  );

  /** Only the first (main) seat per user shows pigeon when they are 鸽子; friend seats always show friend avatar. */
  const myMainSeatIds = useMemo(() => {
    const sorted = [...myReservations].sort((a, b) =>
      (a.created_at ?? a.id).localeCompare(b.created_at ?? b.id)
    );
    const set = new Set<string>();
    if (sorted[0]) set.add(sorted[0].id);
    return set;
  }, [myReservations]);

  /** Cancel selection is keyed by seat_key so one selected seat = one entry (avoids counting wrong when opening modal). */
  const toggleCancelSelection = useCallback((seatKey: string) => {
    if (!myReservations.some((r) => r.seat_key === seatKey)) return;
    setCancelSelection((prev) => {
      const next = new Set(prev);
      if (next.has(seatKey)) next.delete(seatKey);
      else next.add(seatKey);
      return next;
    });
  }, [myReservations]);

  const openCancelModalFromSelection = useCallback(() => {
    const current = cancelSelectionRef.current;
    if (current.size === 0) return;
    const list = myReservations.filter((r) => current.has(r.seat_key));
    if (list.length === 0) return;
    setPendingCancelListEasterEgg(list);
    setShowCancelEasterEgg(true);
  }, [myReservations]);

  const giveUpEasterEgg = useCallback(() => {
    setShowCancelEasterEgg(false);
    setPendingCancelListEasterEgg([]);
  }, []);

  const confirmCancelEasterEgg = useCallback(() => {
    const list = pendingCancelListEasterEgg;
    setShowCancelEasterEgg(false);
    setPendingCancelListEasterEgg([]);
    if (list.length > 0) setCancelModalReservations(list);
  }, [pendingCancelListEasterEgg]);

  const closeCancelModal = useCallback(() => {
    setCancelModalReservations(null);
    setCancelSelection(new Set());
  }, []);

  /** Display label per reservation: first seat per user = name (or "You"), rest = "XXX's friend". */
  const reservationDisplayLabel = useMemo(() => {
    const map = new Map<string, string>();
    const nonGhost = reservations.filter((r) => !r.is_ghost);
    const byUser = new Map<string, Reservation[]>();
    for (const r of nonGhost) {
      const list = byUser.get(r.user_id) ?? [];
      list.push(r);
      byUser.set(r.user_id, list);
    }
    for (const list of Array.from(byUser.values())) {
      const sorted = [...list].sort((a, b) =>
        (a.created_at ?? a.id).localeCompare(b.created_at ?? b.id)
      );
      const displayName = sorted[0].profiles?.display_name ?? '—';
      sorted.forEach((r, i) => {
        if (i === 0) {
          map.set(r.id, r.user_id === currentUser?.id ? t.screening.you : displayName);
        } else {
          map.set(
            r.id,
            t.screening.friendSeatLabel.replace('{name}', displayName)
          );
        }
      });
    }
    for (const r of reservations.filter((r) => r.is_ghost)) {
      map.set(r.id, r.ghost_name ?? '—');
    }
    return map;
  }, [reservations, currentUser?.id, t.screening.you, t.screening.friendSeatLabel]);

  const myWaitlistEntry = waitlistEntries.find(
    (e) => e.user_id === currentUser?.id
  );
  /** Guests may not join waitlist with a seat; admin + ?testSqueeze=1 can (solo testing). */
  const canShowJoinWaitlistButton =
    allFull &&
    !myWaitlistEntry &&
    (myReservations.length === 0 || (isAdmin && testSqueeze));
  const contactFilled = hasProfileContact(currentUserProfile ?? undefined);

  const openClaim = (seatKey: string) => {
    if (!currentUser) {
      router.push(`/auth/login?redirect=${encodeURIComponent(`/screening/${screeningId}`)}`);
      return;
    }
    if (!contactFilled) {
      router.push('/profile/setup');
      return;
    }
    setPendingSeatKeys((prev) =>
      prev.includes(seatKey)
        ? prev.filter((k) => k !== seatKey)
        : prev.length >= MAX_PENDING_SEATS
          ? prev
          : [...prev, seatKey]
    );
  };

  const openSqueeze = (seatKey: string) => {
    if (!currentUser) {
      router.push(`/auth/login?redirect=${encodeURIComponent(`/screening/${screeningId}`)}`);
      return;
    }
    if (!contactFilled) {
      router.push('/profile/setup');
      return;
    }
    setPendingSqueeze(seatKey);
  };

  const claimSeats = async (seatKeys: string[]) => {
    if (!currentUser || seatKeys.length === 0 || loading) return;
    setLoading(true);
    setSeatError(null);
    setConfirmMultiOpen(false);
    const res = await fetch('/api/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screeningId, seatKeys }),
    });
    setLoading(false);
    setPendingSeatKeys([]);
    setPendingSqueeze(null);
    if (res.ok) {
      const data = await res.json();
      const added = Array.isArray(data.reservations) ? data.reservations : (data.reservation ? [data.reservation] : []);
      if (added.length > 0) {
        setReservations((prev) => [...prev, ...added]);
      }
      router.refresh();
      await onReservationsChange?.();
    } else {
      const data = await res.json().catch(() => ({}));
      const msg = typeof data?.error === 'string' ? data.error : '';
      const isAlreadyTaken = /already taken|已被占用|已被选/i.test(msg);
      if (isAlreadyTaken) {
        setSeatError(t.screening.seatAlreadyTaken);
      } else {
        setSeatError(msg || t.screening.reserveFailed);
      }
      router.refresh();
      await onReservationsChange?.();
      setTimeout(() => setSeatError(null), 8000);
    }
  };

  const openWaitlistJoinModal = () => {
    if (!currentUser) {
      router.push(`/auth/login?redirect=${encodeURIComponent(`/screening/${screeningId}`)}`);
      return;
    }
    if (!contactFilled) {
      router.push('/profile/setup');
      return;
    }
    if (myWaitlistEntry || loading) return;
    setWaitlistJoinModalOpen(true);
  };

  const performJoinWaitlist = async () => {
    if (!currentUser || myWaitlistEntry || loading) return;
    if (!contactFilled) {
      router.push('/profile/setup');
      return;
    }
    setWaitlistJoinModalOpen(false);
    setLoading(true);
    const res = await fetch('/api/waitlist/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screeningId }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data?.error;
      setSeatError(typeof err === 'string' ? err : t.screening.waitlistJoinFailed);
      setTimeout(() => setSeatError(null), 8000);
      return;
    }
    const { data: wl } = await createClient()
      .from('waitlist')
      .select('id, position, user_id, profiles(display_name, avatar_config)')
      .eq('screening_id', screeningId)
      .eq('status', 'waiting')
      .order('position', { ascending: true });
    setWaitlistEntries((wl as unknown as WaitlistEntry[]) ?? []);
    router.refresh();
    await onReservationsChange?.();
  };

  const leaveWaitlist = async () => {
    if (!myWaitlistEntry || loading) return;
    setLoading(true);
    const res = await fetch('/api/waitlist/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screeningId }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = typeof body?.error === 'string' ? body.error : t.screening.waitlistLeaveFailed;
      setSeatError(msg);
      setTimeout(() => setSeatError(null), 8000);
      return;
    }
    await fetchWaitlist();
    router.refresh();
    await onReservationsChange?.();
  };

  const allSeats = room.furniture.flatMap((p) => getSeatPositions(p));
  const avatarPx = Math.max(36, Math.round(room.canvasW * 0.06));
  const nameSize = Math.max(9, Math.round(10 * scale));
  const seatTransform = 'translateX(-50%) translateY(-50%)';

  return (
    <div>
      {seatError && (
        <div className="mb-3 p-3 border border-[#e8c84a] bg-[#1a1510] font-mono text-[12px] text-[#e8c84a]" style={{ borderRadius: 0 }}>
          {seatError}
        </div>
      )}
      <div className="flex gap-4 font-mono text-[13px] text-[#888888] mb-4 flex-wrap">
        <span>
          <span className="text-[#e8c84a]">{reservations.length}</span> /{' '}
          {roomCapacityWithSqueeze(room.furniture)} {t.screening.seatsTaken}
        </span>
        {squeezeNote && (
          <span className="text-[#444444]">· {squeezeNote}</span>
        )}
      </div>

      {isMobile && pendingSeatKeys.length > 0 && (
        <div className="mb-4 p-3 border border-[#e8c84a] bg-[#1a1510]" style={{ borderRadius: 0 }}>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            {pendingSeatKeys.map((key, i) => (
              <span key={key}>
                {i > 0 && ' · '}
                {t.screening.selectedSeat} {i + 1}: {seatKeyToDisplayLabel(key)}
              </span>
            ))}
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setConfirmMultiOpen(true)}
              className="font-mono text-[10px] tracking-[0.2em] uppercase bg-[#e8c84a] text-[#0f0f0f] px-4 py-2 min-h-[44px] hover:opacity-90 transition-opacity"
              style={{ borderRadius: 0 }}
            >
              {myReservations.length >= 1 && pendingSeatKeys.length === 1
                ? t.screening.claimAnotherSeat
                : t.screening.claimNSeats.replace('{n}', String(pendingSeatKeys.length))}
            </button>
            <button
              type="button"
              onClick={() => setPendingSeatKeys([])}
              className="font-mono text-[10px] tracking-[0.2em] uppercase border border-[#2a2a2a] text-[#888888] px-4 py-2 min-h-[44px] hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
              style={{ borderRadius: 0 }}
            >
              {t.screening.clearSelection}
            </button>
          </div>
        </div>
      )}

      {isMobile && (!isAdmin || testSqueeze) && myReservations.length > 0 && cancelSelection.size > 0 && (
        <div className="mb-4 p-3 border border-[#2a2a2a] bg-[#1a1510]" style={{ borderRadius: 0 }}>
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#555] mb-2">
            {t.screening.cancelSelectHint}
          </p>
          {myReservations.length > 1 && (
            <p className="font-mono text-[10px] text-[#666] mb-2">
              {t.screening.cancelSelectHintMulti}
            </p>
          )}
          <button
            type="button"
            onClick={openCancelModalFromSelection}
            className="font-mono text-[10px] tracking-[0.2em] uppercase py-2 px-4 min-h-[44px] border border-[#f87171] text-[#f87171] hover:bg-[#f87171]/10 transition-colors"
            style={{ borderRadius: 0 }}
          >
            {t.screening.cancelSelectedCount.replace('{n}', String(cancelSelection.size))}
          </button>
        </div>
      )}

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
              furnitureFocusBox
                ? `${furnitureFocusBox.w}/${furnitureFocusBox.h}`
                : `${room.canvasW}/${room.canvasH}`,
          }}
        >
        <svg
          viewBox={
            furnitureFocusBox
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
            fill={roomBgPreset.fill}
          />
          {Array.from({ length: Math.max(1, Math.ceil(room.canvasH / 40)) }, (_, i) => (
            <rect
              key={i}
              x={0}
              y={(i + 1) * 40}
              width={room.canvasW}
              height={1}
              fill={roomBgPreset.lineFill}
            />
          ))}
          {/* Rug at bottom, then furniture, then other decorations */}
          {room.decorations.filter((d) => d.type === 'rug').map((d) => (
            <DecorationSVG key={d.id} decoration={d} />
          ))}
          {room.furniture.map((p) => (
            <FurnitureSVG key={p.id} piece={p} />
          ))}
          {room.decorations.filter((d) => d.type !== 'rug').map((d) => (
            <DecorationSVG key={d.id} decoration={d} />
          ))}
        </svg>

        {/* Layer 1: normal seats */}
        {allSeats.map(({ seatKey, x, y }) => {
          const reservation = reservations.find((r) => r.seat_key === seatKey);
          const isMe = myReservations.some((r) => r.seat_key === seatKey);
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
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isMe) toggleCancelSelection(seatKey);
                    else if (isAdmin) setAdminDetailReservation(reservation);
                    else setGuestPeekReservation(reservation);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    if (isMe) toggleCancelSelection(seatKey);
                    else if (isAdmin) setAdminDetailReservation(reservation);
                    else setGuestPeekReservation(reservation);
                  }}
                  className={`flex flex-col items-center relative cursor-pointer hover:opacity-90 ${isMe && cancelSelection.has(reservation.seat_key) ? 'ring-2 ring-[#f87171] ring-offset-1 ring-offset-[#2a2218]' : ''}`}
                >
                  {/* Blood bar only on my main seat; friend seats have no blood bar */}
                  {isMe && myMainSeatIds.has(reservation.id) && (
                    <BloodBar
                      noShowCount={currentUserProfile?.no_show_count ?? 0}
                      segmentClassName="w-1.5 h-1.5"
                      className="mb-px"
                      ariaLabel={t.profile.bloodBar}
                    />
                  )}
                  {/* Pigeon only on my main seat; friend seats always show friend avatar */}
                  {(currentUserProfile?.no_show_count ?? 0) >= 3 && isMe && myMainSeatIds.has(reservation.id) && !reservation.ghost_avatar ? (
                    <PigeonIcon size={slotW * 2} title="Pigeon" className="flex-shrink-0" />
                  ) : (
                    <AvatarSVG
                      config={
                        reservation.friend_avatar != null
                          ? jsonToConfig(reservation.friend_avatar)
                          : reservation.ghost_avatar != null
                            ? jsonToConfig(reservation.ghost_avatar)
                            : isMe && !myMainSeatIds.has(reservation.id)
                              ? avatarConfigFromSeed(reservation.id)
                              : jsonToConfig(reservation.profiles?.avatar_config)
                      }
                      size={slotW}
                      pose="sit"
                    />
                  )}
                  {isAdmin && reservation.is_ghost && (
                    <span
                      className="absolute -top-0.5 -right-0.5 text-[10px] leading-none"
                      title={t.screening.ghostSeat}
                    >
                      👻
                    </span>
                  )}
                  <span
                    className={`font-mono truncate text-center leading-none block ${
                      isMe ? 'text-[#e8c84a]' : 'text-[#888888]'
                    }`}
                    style={{
                      fontSize: nameSize,
                      maxWidth: slotW,
                      marginTop: -Math.max(4, Math.round(slotW * 0.18)),
                    }}
                  >
                    {reservationDisplayLabel.get(reservation.id) ??
                      reservation.ghost_name ??
                      reservation.profiles?.display_name ??
                      '—'}
                  </span>
                </div>
              ) : isAdmin ? (
                <div
                  className="border border-[#333] bg-[#1a1a1a] flex items-center justify-center min-w-[44px] min-h-[44px] opacity-60"
                  style={{
                    width: Math.max(40, slotW),
                    height: Math.max(40, slotH),
                    borderRadius: 0,
                  }}
                  title={seatKeyToDisplayLabel(seatKey)}
                  aria-hidden
                />
              ) : (
                <button
                  type="button"
                  onClick={() => openClaim(seatKey)}
                  disabled={loading || (pendingSeatKeys.includes(seatKey) ? false : pendingSeatKeys.length >= MAX_PENDING_SEATS)}
                  className={`border-2 border-dashed bg-transparent flex items-center justify-center font-mono text-lg disabled:opacity-30 min-w-[44px] min-h-[44px] transition-colors ${
                    pendingSeatKeys.includes(seatKey)
                      ? 'border-[#e8c84a] text-[#e8c84a] shadow-[0_0_10px_rgba(232,200,74,0.5)]'
                      : 'border-[#b8b8b8] text-[#b8b8b8] hover:border-[#e8c84a] hover:text-[#e8c84a] hover:shadow-[0_0_8px_rgba(232,200,74,0.35)]'
                  }`}
                  style={{
                    width: Math.max(40, slotW),
                    height: Math.max(40, slotH),
                    borderRadius: 0,
                  }}
                  title={seatKeyToDisplayLabel(seatKey)}
                >
                  +
                </button>
              )}
            </div>
          );
        })}

        {/* Layer 2: squeeze slots — guests when full; admin when testSqueeze or when any squeeze reservations exist */}
        {showSqueezeLayer &&
        room.furniture.map(
          (piece) =>
            (showSqueezeFor(piece) || (testSqueeze && isAdmin && canSqueeze(piece) && piece.squeezeExtra > 0) || hasSqueezeReservationOnPiece(piece)) &&
            getSqueezePositions(piece).map(({ seatKey, x, y }) => {
              const reservation = reservations.find((r) => r.seat_key === seatKey);
              const isMe = myReservations.some((r) => r.seat_key === seatKey);
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
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isMe) toggleCancelSelection(seatKey);
                        else if (isAdmin) setAdminDetailReservation(reservation);
                        else setGuestPeekReservation(reservation);
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return;
                        e.preventDefault();
                        if (isMe) toggleCancelSelection(seatKey);
                        else if (isAdmin) setAdminDetailReservation(reservation);
                        else setGuestPeekReservation(reservation);
                      }}
                      className={`flex flex-col items-center relative cursor-pointer hover:opacity-90 ${isMe && cancelSelection.has(reservation.seat_key) ? 'ring-2 ring-[#f87171] ring-offset-1 ring-offset-[#2a2218]' : ''}`}
                    >
                      {/* Blood bar only on my main seat; friend seats have no blood bar */}
                      {isMe && myMainSeatIds.has(reservation.id) && (
                        <BloodBar
                          noShowCount={currentUserProfile?.no_show_count ?? 0}
                          segmentClassName="w-1.5 h-1.5"
                          className="mb-px"
                          ariaLabel={t.profile.bloodBar}
                        />
                      )}
                      {/* Pigeon only on my main seat; friend seats always show friend avatar */}
                      {(currentUserProfile?.no_show_count ?? 0) >= 3 && isMe && myMainSeatIds.has(reservation.id) && !reservation.ghost_avatar ? (
                        <PigeonIcon size={slotW * 2} title="Pigeon" className="flex-shrink-0" />
                      ) : (
                        <AvatarSVG
                          config={
                            reservation.friend_avatar != null
                              ? jsonToConfig(reservation.friend_avatar)
                              : reservation.ghost_avatar != null
                                ? jsonToConfig(reservation.ghost_avatar)
                                : isMe && !myMainSeatIds.has(reservation.id)
                                  ? avatarConfigFromSeed(reservation.id)
                                  : jsonToConfig(reservation.profiles?.avatar_config)
                          }
                          size={slotW}
                          pose="sit"
                        />
                      )}
                      {isAdmin && reservation.is_ghost && (
                        <span
                          className="absolute -top-0.5 -right-0.5 text-[10px] leading-none"
                          title={t.screening.ghostSeat}
                        >
                          👻
                        </span>
                      )}
                      <span
                        className={`font-mono truncate text-center leading-none block ${
                          isMe ? 'text-[#e8c84a]' : 'text-[#888888]'
                        }`}
                        style={{
                          fontSize: nameSize,
                          maxWidth: slotW,
                          marginTop: -Math.max(4, Math.round(slotW * 0.18)),
                        }}
                      >
                        {reservationDisplayLabel.get(reservation.id) ??
                          reservation.ghost_name ??
                          reservation.profiles?.display_name ??
                          '—'}
                      </span>
                    </div>
                  ) : isAdmin && !testSqueeze ? (
                    <div
                      className="border border-[#333] bg-[#1a1a1a] flex items-center justify-center min-w-[40px] min-h-[40px] opacity-60"
                      style={{
                        width: Math.max(40, slotW),
                        height: Math.max(40, slotH),
                        borderRadius: 0,
                      }}
                      aria-hidden
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => openSqueeze(seatKey)}
                      disabled={loading}
                      className="border-2 border-dashed border-[#e8a0a0] bg-transparent text-[#e8a0a0] flex items-center justify-center hover:border-[#f87171] hover:text-[#f87171] hover:opacity-95 transition-all font-mono text-[9px] tracking-[0.15em] uppercase min-w-[40px] min-h-[40px]"
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

        {/* Right column: admin without testSqueeze = Waiting list only; else = Squeeze In + Waiting List */}
        <div
          className="p-4 border-2 border-dashed border-[#333] bg-[#1a1510] text-center transition-[border-color] duration-200"
          style={{
            borderRadius: 0,
            width: isMobile ? '100%' : 280,
            flexShrink: 0,
          }}
        >
        {isAdmin && !testSqueeze ? (
          <>
            <div className="font-mono text-[13px] tracking-[0.2em] text-[#c084fc]">
              {t.admin.waitlistTitle}
            </div>
            <div className="font-mono text-[10px] tracking-[0.2em] text-[#444] mt-0.5">
              {t.admin.waitingPeople.replace('{n}', String(waitlistEntries.length))}
            </div>
            {waitlistEntries.length === 0 ? (
              <p className="font-mono text-[10px] tracking-[0.2em] text-[#555] mt-4">
                {t.admin.waitlistEmpty}
              </p>
            ) : (
              <div className="mt-4 space-y-3 text-left">
                {waitlistEntries.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-center gap-2 py-2 border-b border-[#2a2a2a] last:border-0"
                  >
                    <span className="font-mono text-[10px] text-[#555] w-5">{i + 1}</span>
                    <AvatarSVG
                      config={jsonToConfig(entry.profiles.avatar_config)}
                      size={32}
                      pose="stand"
                    />
                    <span className="font-mono text-[12px] text-[#e8e4dc] flex-1 min-w-0 truncate">
                      {entry.profiles.display_name}
                    </span>
                    <WaitlistPromoteInline
                      screeningId={screeningId}
                      waitlistId={entry.id}
                      availableSeatKeys={availableSeatKeys}
                      onDone={() => { fetchWaitlist(); router.refresh(); }}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div
              className="cursor-pointer transition-colors duration-200 hover:text-[#f87171] hover:border-[#f87171]"
              style={{ borderColor: 'inherit' }}
            >
              <div className="font-mono text-[13px] tracking-[0.2em] text-[#555]">
                {t.screening.squeezeInZone}
              </div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-[#444] mt-0.5">
                {t.screening.squeezeInSub}
              </div>
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
                  {canShowJoinWaitlistButton && (
                    <button
                      type="button"
                      onClick={openWaitlistJoinModal}
                      className="border-2 border-dashed border-[#c8b0e8] bg-transparent hover:border-[#c084fc] hover:text-[#c084fc] hover:opacity-95 w-12 h-14 flex items-center justify-center text-[#c8b0e8] transition-colors font-mono text-xl min-w-[44px] min-h-[44px]"
                      style={{ borderRadius: 0 }}
                    >
                      +
                    </button>
                  )}
                </div>
                {myWaitlistEntry && (
                  <button
                    type="button"
                    onClick={leaveWaitlist}
                    disabled={loading}
                    className="mt-3 w-full font-mono text-[10px] tracking-[0.2em] uppercase py-2 px-3 min-h-[44px] border border-[#f87171] text-[#f87171] hover:bg-[#f87171]/10 transition-colors disabled:opacity-50"
                    style={{ borderRadius: 0 }}
                  >
                    {loading ? t.common.loading : t.screening.leaveWaitlist}
                  </button>
                )}
                {waitlistMode === 'auto' && (
                  <p className="font-mono text-[13px] text-[#444444]">
                    {t.screening.ifSomeoneCancels}
                  </p>
                )}
              </>
            )}
          </>
        )}

        {/* Desktop: Claim Seats + Cancel below Squeeze In */}
        {!isMobile && pendingSeatKeys.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
              {pendingSeatKeys.map((key, i) => (
                <span key={key}>
                  {i > 0 && ' · '}
                  {t.screening.selectedSeat} {i + 1}: {seatKeyToDisplayLabel(key)}
                </span>
              ))}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setConfirmMultiOpen(true)}
                className="w-full font-mono text-[10px] tracking-[0.2em] uppercase bg-[#e8c84a] text-[#0f0f0f] px-4 py-2 min-h-[44px] hover:opacity-90 transition-opacity"
                style={{ borderRadius: 0 }}
              >
                {myReservations.length >= 1 && pendingSeatKeys.length === 1
                  ? t.screening.claimAnotherSeat
                  : t.screening.claimNSeats.replace('{n}', String(pendingSeatKeys.length))}
              </button>
              <button
                type="button"
                onClick={() => setPendingSeatKeys([])}
                className="w-full font-mono text-[10px] tracking-[0.2em] uppercase border border-[#2a2a2a] text-[#888888] px-4 py-2 min-h-[44px] hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
                style={{ borderRadius: 0 }}
              >
                {t.screening.clearSelection}
              </button>
            </div>
          </div>
        )}
        {!isMobile && (!isAdmin || testSqueeze) && myReservations.length > 0 && cancelSelection.size > 0 && (
          <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#555] mb-2">
              {t.screening.cancelSelectHint}
            </p>
            {myReservations.length > 1 && (
              <p className="font-mono text-[10px] text-[#666] mb-2">
                {t.screening.cancelSelectHintMulti}
              </p>
            )}
            <button
              type="button"
              onClick={openCancelModalFromSelection}
              className="w-full font-mono text-[10px] tracking-[0.2em] uppercase py-2 px-4 min-h-[44px] border border-[#f87171] text-[#f87171] hover:bg-[#f87171]/10 transition-colors"
              style={{ borderRadius: 0 }}
            >
              {t.screening.cancelSelectedCount.replace('{n}', String(cancelSelection.size))}
            </button>
          </div>
        )}
        </div>
      </div>

      <ClaimModal
        open={confirmMultiOpen && pendingSeatKeys.length > 0}
        onClose={() => setConfirmMultiOpen(false)}
        seatLabels={pendingSeatKeys.map(seatKeyToDisplayLabel)}
        screeningTitle={screeningTitle}
        titleOverride={
          myReservations.length >= 1 && pendingSeatKeys.length === 1
            ? t.screening.claimAnotherSeat
            : myReservations.length >= 1 && pendingSeatKeys.length > 1
              ? t.screening.claimNSeats.replace('{n}', String(pendingSeatKeys.length))
              : undefined
        }
        friendNote={
          myReservations.length >= 1
            ? t.screening.claimAnotherSeatSub.replace(
                '{name}',
                myReservations[0]?.profiles?.display_name ?? '—'
              )
            : null
        }
        isMobile={isMobile}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            claimSeats(pendingSeatKeys);
          }}
        >
          <p className="font-mono text-[13px] text-[#888888] mb-3">
            {t.screening.confirmMultiSeat.replace('{n}', String(pendingSeatKeys.length))}
          </p>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#e8c84a] text-[#0f0f0f] font-mono text-[10px] tracking-[0.2em] uppercase py-3 min-h-[44px] hover:opacity-85 active:scale-[0.97] disabled:opacity-60 transition-all"
            style={{ borderRadius: 0 }}
          >
            {myReservations.length >= 1 && pendingSeatKeys.length === 1
              ? t.screening.claimAnotherSeat
              : t.screening.claimNSeats.replace('{n}', String(pendingSeatKeys.length))}
          </button>
        </form>
      </ClaimModal>

      <SqueezeModal
        open={!!pendingSqueeze}
        onClose={() => setPendingSqueeze(null)}
        onConfirm={() => {
          if (pendingSqueeze) claimSeats([pendingSqueeze]);
        }}
        loading={loading}
        isMobile={isMobile}
      />

      {waitlistJoinModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
          onClick={() => !loading && setWaitlistJoinModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="waitlist-join-title"
        >
          <div
            className="bg-[#0f0f0f] border border-[#e8c84a] p-6 w-full max-w-sm relative"
            style={{ borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="waitlist-join-title"
              className="font-serif text-lg italic text-[#e8c84a] mb-2"
            >
              {t.screening.waitlistJoinTitle}
            </h2>
            <p className="font-mono text-[12px] text-[#888888] mb-6 leading-relaxed">
              {t.screening.waitlistJoinBody}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => !loading && setWaitlistJoinModalOpen(false)}
                className="flex-1 border border-[#2a2a2a] text-[#888888] font-mono text-[10px] tracking-[0.2em] uppercase py-3 min-h-[44px] hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
                style={{ borderRadius: 0 }}
              >
                {t.screening.cancel}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void performJoinWaitlist()}
                className="flex-1 bg-[#e8c84a] text-[#0f0f0f] font-mono text-[10px] tracking-[0.2em] uppercase py-3 min-h-[44px] hover:opacity-85 active:scale-[0.97] disabled:opacity-60 transition-all"
                style={{ borderRadius: 0 }}
              >
                {loading ? t.common.loading : t.screening.waitlistJoinConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Easter egg: video + single yellow Confirm; after Confirm, user sees the real cancel modal where they can cancel or not */}
      {showCancelEasterEgg && pendingCancelListEasterEgg.length > 0 && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80"
          onClick={giveUpEasterEgg}
          role="dialog"
          aria-modal="true"
          aria-label="Video"
        >
          <div
            className="bg-[#0f0f0f] border border-[#e8c84a] w-full max-w-[280px] relative flex flex-col items-center p-4"
            style={{ borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full aspect-[9/16] max-h-[50vh] bg-black flex-shrink-0">
              <iframe
                title="YouTube Shorts"
                src={YOUTUBE_SHORTS_EMBED}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; web-share"
                allowFullScreen
              />
            </div>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mt-3 text-center">
              {t.screening.cancelEasterEggVideoLabel}
            </p>
            <button
              type="button"
              onClick={confirmCancelEasterEgg}
              className="mt-4 w-full font-mono text-[10px] tracking-[0.2em] uppercase py-3 bg-[#e8c84a] text-[#0f0f0f] hover:opacity-90 transition-opacity"
              style={{ borderRadius: 0 }}
            >
              {t.screening.cancelEasterEggConfirm}
            </button>
          </div>
        </div>
      )}

      {/* User: cancel reservation modal (opened from Cancel button after selecting seats) */}
      {cancelModalReservations && cancelModalReservations.length > 0 && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
          onClick={() => !cancelLoading && closeCancelModal()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-reservation-title"
        >
          <div
            className="bg-[#0f0f0f] border border-[#e8c84a] p-6 w-full max-w-sm relative"
            style={{ borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="cancel-reservation-title" className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-4">
              {cancelModalReservations.length === 1
                ? t.screening.cancelThisSeat
                : t.screening.cancelAllNSeats.replace('{n}', String(cancelModalReservations.length))}
            </h2>
            <ul className="font-mono text-[13px] text-[#e8e4dc] mb-4 list-disc list-inside">
              {cancelModalReservations.map((r) => (
                <li key={r.id}>{seatKeyToDisplayLabel(r.seat_key)}</li>
              ))}
            </ul>
            {myReservations.length > 1 && cancelModalReservations.length < myReservations.length && (
              <button
                type="button"
                onClick={() => setCancelModalReservations(myReservations)}
                className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] hover:text-[#e8c84a] mb-4 block"
              >
                {t.screening.cancelSwitchToAllNSeats.replace('{n}', String(myReservations.length))}
              </button>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => !cancelLoading && closeCancelModal()}
                className="flex-1 border border-[#2a2a2a] text-[#888888] font-mono text-[10px] tracking-[0.2em] uppercase py-3 hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
                style={{ borderRadius: 0 }}
              >
                {t.screening.cancel}
              </button>
              <button
                type="button"
                disabled={cancelLoading}
                onClick={async () => {
                  setCancelLoading(true);
                  let lastNoShow: number | undefined;
                  let lastPigeon = false;
                  let lastData: { reservations?: unknown[] } | null = null;
                  try {
                    const canceledIds = new Set(cancelModalReservations.map((r) => r.id));
                    for (const r of cancelModalReservations) {
                      const res = await fetch('/api/cancel', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reservationId: r.id }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Cancel failed');
                      lastData = data;
                      if (data.noShowCount != null) lastNoShow = data.noShowCount;
                      if (data.isPigeon) lastPigeon = true;
                    }
                    if (Array.isArray(lastData?.reservations)) {
                      setReservations(lastData.reservations as Reservation[]);
                    } else {
                      setReservations((prev) => prev.filter((r) => !canceledIds.has(r.id)));
                    }
                    closeCancelModal();
                    router.refresh();
                    await onReservationsChange?.();
                    if (lastNoShow != null) {
                      const msg = lastPigeon
                        ? t.screening.pigeonReminder + ' ' + t.screening.pigeonRecoveryReminder
                        : t.screening.pigeonReminder;
                      alert(msg);
                    }
                  } finally {
                    setCancelLoading(false);
                  }
                }}
                className="flex-1 border border-[#f87171] text-[#f87171] font-mono text-[10px] tracking-[0.2em] uppercase py-3 hover:bg-[#f87171]/10 transition-colors disabled:opacity-50"
                style={{ borderRadius: 0 }}
              >
                {cancelLoading ? t.common.loading : t.screening.cancelReservationConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Non-admin: guest peek modal (avatar, blood bar, name only; no wechat) */}
      {!isAdmin && guestPeekReservation && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
          onClick={() => setGuestPeekReservation(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-peek-title"
        >
          <div
            className="bg-[#0f0f0f] border border-[#2a2a2a] p-6 w-full max-w-[280px] relative flex flex-col items-center"
            style={{ borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setGuestPeekReservation(null)}
              className="absolute top-3 right-3 font-mono text-xl leading-none text-[#888888] hover:text-[#e8c84a] transition-colors"
              aria-label={t.admin.close}
            >
              ×
            </button>
            <h2 id="guest-peek-title" className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-4">
              {t.admin.guestPeekTitle}
            </h2>
            <BloodBar
              noShowCount={guestPeekReservation.profiles?.no_show_count ?? 0}
              segmentClassName="w-2 h-2"
              className="mb-3"
              ariaLabel={t.profile.bloodBar}
            />
            {(guestPeekReservation.profiles?.no_show_count ?? 0) >= 3 &&
            guestPeekReservation.friend_avatar == null &&
            guestPeekReservation.ghost_avatar == null ? (
              <PigeonIcon size={160} title="Pigeon" className="flex-shrink-0" />
            ) : (
              <AvatarSVG
                config={
                  guestPeekReservation.friend_avatar != null
                    ? jsonToConfig(guestPeekReservation.friend_avatar)
                    : guestPeekReservation.ghost_avatar != null
                      ? jsonToConfig(guestPeekReservation.ghost_avatar)
                      : jsonToConfig(guestPeekReservation.profiles?.avatar_config)
                }
                size={80}
                pose="stand"
              />
            )}
            <span className="font-mono text-[14px] text-[#e8e4dc] mt-3 truncate max-w-full">
              {reservationDisplayLabel.get(guestPeekReservation.id) ??
                guestPeekReservation.ghost_name ??
                guestPeekReservation.profiles?.display_name ??
                '—'}
            </span>
            {(() => {
              const badge = getBadgeLevel(guestPeekReservation.profiles?.attendance_count ?? 0);
              return (
                <span className="font-mono text-[12px] text-[#888888] mt-1.5" title={locale === 'zh' ? badge.label : badge.labelEn}>
                  {badge.emoji} {locale === 'zh' ? badge.label : badge.labelEn}
                </span>
              );
            })()}
            <button
              type="button"
              onClick={() => setGuestPeekReservation(null)}
              className="mt-6 w-full border border-[#2a2a2a] text-[#888888] font-mono text-[10px] tracking-[0.2em] uppercase py-3 hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
              style={{ borderRadius: 0 }}
            >
              {t.admin.close}
            </button>
          </div>
        </div>
      )}

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
              {(() => {
                const contact = getProfileContact(adminDetailReservation.profiles ?? {});
                const contactLabels = {
                  wechat: t.admin.contactIdLabelWechat,
                  whatsapp: t.admin.contactIdLabelWhatsapp,
                  instagram: t.admin.contactIdLabelInstagram,
                  discord: t.admin.contactIdLabelDiscord,
                };
                const fieldLabel = adminContactFieldLabel(contact.platform, contactLabels);
                return (
                  <div>
                    <span className="text-[#888888]">{fieldLabel}</span>
                    <p className="text-[#e8e4dc] mt-0.5 break-all">
                      {contact.id || '—'}
                    </p>
                    {contact.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(contact.id);
                        }}
                        className="mt-2 text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] hover:underline"
                      >
                        {t.admin.copyContactId}
                      </button>
                    ) : null}
                  </div>
                );
              })()}
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

function WaitlistPromoteInline({
  screeningId,
  waitlistId,
  availableSeatKeys,
  onDone,
}: {
  screeningId: string;
  waitlistId: string;
  availableSeatKeys: string[];
  onDone: () => void;
}) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);
  const [seatKey, setSeatKey] = useState('');

  const promote = async () => {
    const key = seatKey.trim();
    if (!key) return;
    setLoading(true);
    try {
      const res = await fetch('/api/waitlist/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screeningId, waitlistId, seatKey: key }),
      });
      if (res.ok) onDone();
    } finally {
      setLoading(false);
      setSeatKey('');
    }
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {availableSeatKeys.length > 0 ? (
        <>
          <select
            value={seatKey}
            onChange={(e) => setSeatKey(e.target.value)}
            className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[11px] px-2 py-1 outline-none focus:border-[#e8c84a]"
            style={{ borderRadius: 0 }}
          >
            <option value="">{t.admin.seatKeyPlaceholder}</option>
            {availableSeatKeys.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={promote}
            disabled={loading || !seatKey.trim()}
            className="font-mono text-[10px] tracking-[0.2em] uppercase px-2 py-1 border border-[#c084fc] text-[#c084fc] hover:opacity-85 disabled:opacity-50 transition-opacity"
            style={{ borderRadius: 0 }}
          >
            {loading ? '…' : t.admin.promote}
          </button>
        </>
      ) : (
        <span className="font-mono text-[10px] text-[#555]">{t.admin.noFreeSeat}</span>
      )}
    </div>
  );
}
