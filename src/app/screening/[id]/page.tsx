import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import { getT, type Locale } from '@/lib/i18n';
import { fetchScreeningAltLocaleByIds } from '@/lib/screening-alt-locale-fetch';
import { fetchScreeningDetailRow } from '@/lib/fetch-screening-detail-row';
import { fetchAttendanceCounts } from '@/lib/attendance';
import BackButton from '@/components/BackButton';
import SeatMap from '@/components/SeatMap';
import GhostSeatManager from '@/components/GhostSeatManager';
import AdminScreeningGuests from '@/components/AdminScreeningGuests';
import ScreeningRedirect from '@/components/ScreeningRedirect';
import ScreeningSeatMapWrapper from './ScreeningSeatMapWrapper';
import ScreeningFilmHeading from './ScreeningFilmHeading';
import ScreeningFilmDetails from './ScreeningFilmDetails';

export const dynamic = 'force-dynamic';

export default async function ScreeningPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ testSqueeze?: string } | null>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const squeezeTestParam = (() => {
    if (!sp) return undefined;
    const o = sp as Record<string, string | string[] | undefined>;
    const pick = (key: string) => {
      const v = o[key];
      if (typeof v === 'string') return v;
      if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
      return undefined;
    };
    return pick('testSqueeze') ?? pick('testsqueeze');
  })();
  const supabase = await createClient();
  const cookieStore = await cookies();
  const locale: Locale = cookieStore.get('sofa-salon-locale')?.value === 'zh' ? 'zh' : 'en';
  const t = getT(locale);

  const [{ data: screening }, { data: { user } }] = await Promise.all([
    fetchScreeningDetailRow(supabase, id),
    supabase.auth.getUser(),
  ]);

  if (!screening) notFound();
  const altLocaleById = await fetchScreeningAltLocaleByIds(supabase, [id]);
  const altRow = altLocaleById[id];
  const links = screening as {
    douban_url?: string | null;
    letterboxd_url?: string | null;
    trailer_url?: string | null;
  };
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
    room_background_id?: string | null;
  };
  const furniture = (room.furniture_json as Array<unknown>) ?? [];
  const decorations = (room.decorations_json as Array<unknown>) ?? [];

  const { data: userProfile } = user
    ? await supabase
        .from('profiles')
        .select('wechat_id, contact_platform, contact_id, is_admin, no_show_count')
        .eq('id', user.id)
        .single()
    : { data: null };
  const isAdmin = userProfile?.is_admin === true;
  const testSqueeze = isAdmin && squeezeTestParam === '1';

  const admin = createAdminClient();
  let reservations: unknown[] | null = null;
  let waitlist: unknown[] | null = null;

  type ReservationRow = {
    user_id?: string | null;
    profiles?: {
      display_name?: string | null;
      avatar_config?: unknown;
      wechat_id?: string | null;
      no_show_count?: number | null;
    } | null;
    [k: string]: unknown;
  };
  const RESERVATION_SELECT =
    'id, seat_key, user_id, is_squeezed, is_ghost, ghost_name, ghost_avatar, friend_avatar, attended, created_at, profiles(display_name, avatar_config, wechat_id, contact_platform, contact_id, no_show_count)';

  if (admin) {
    const [res, wl] = await Promise.all([
      admin
        .from('reservations')
        .select(RESERVATION_SELECT)
        .eq('screening_id', id),
      admin
        .from('waitlist')
        .select('id, position, user_id, profiles(display_name, avatar_config)')
        .eq('screening_id', id)
        .eq('status', 'waiting')
        .order('position', { ascending: true }),
    ]);
    reservations = res.data ?? [];
    waitlist = wl.data ?? [];
    if (!isAdmin) {
      const list = reservations as ReservationRow[];
      reservations = list.map((row) => {
        const p = row.profiles;
        const safeProfile = p
          ? { display_name: p.display_name ?? null, avatar_config: p.avatar_config, no_show_count: p.no_show_count ?? 0 }
          : null;
        return { ...row, profiles: safeProfile };
      });
    }
  } else {
    const [res, wl] = await Promise.all([
      supabase
        .from('reservations')
        .select(RESERVATION_SELECT)
        .eq('screening_id', id),
      supabase
        .from('waitlist')
        .select('id, position, user_id, profiles(display_name, avatar_config)')
        .eq('screening_id', id)
        .eq('status', 'waiting')
        .order('position', { ascending: true }),
    ]);
    reservations = res.data ?? [];
    waitlist = wl.data ?? [];
  }

  // Merge badge attendance_count from SECURITY DEFINER RPC (migration 27).
  const userIds = Array.from(
    new Set(((reservations ?? []) as ReservationRow[]).map((r) => r.user_id).filter((x): x is string => typeof x === 'string' && x.length > 0))
  );
  const attendanceMap =
    userIds.length > 0 ? await fetchAttendanceCounts(supabase, userIds) : new Map<string, number>();
  reservations = ((reservations ?? []) as ReservationRow[]).map((row) => {
    const uid = typeof row.user_id === 'string' ? row.user_id : '';
    const p = row.profiles;
    const nextProfile = p
      ? { ...p, attendance_count: attendanceMap.get(uid) ?? 0 }
      : p ?? null;
    return { ...row, profiles: nextProfile };
  });

  const dateStr = new Date(screening.screening_at).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const isPast = new Date(screening.screening_at).getTime() < Date.now();
  const base = screening as {
    title: string;
    description?: string | null;
    year?: number | null;
    director?: string | null;
    duration_minutes?: number | null;
  };
  const filmDescription = (base.description ?? '').trim();
  const userHasReservation =
    user &&
    (reservations as { user_id?: string }[]).some((r) => r.user_id === user.id);

  return (
    <ScreeningRedirect screeningId={id} isAdmin={isAdmin}>
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 safe-area-inset-bottom bg-[#0f0f0f]">
      <BackButton className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] hover:text-[#e8c84a] mb-4 inline-block transition-colors">
        {t.screening.back}
      </BackButton>
      <ScreeningFilmHeading
        title={base.title}
        titleEn={altRow?.title_en ?? null}
        year={base.year}
        director={base.director}
        directorEn={altRow?.director_en ?? null}
        durationMinutes={base.duration_minutes}
      />
      <ScreeningFilmDetails
        description={filmDescription}
        doubanUrl={links.douban_url ?? ''}
        letterboxdUrl={links.letterboxd_url ?? ''}
        trailerUrl={links.trailer_url ?? ''}
        labels={{
          filmNotes: t.screening.filmNotes,
          linkDouban: t.screening.linkDouban,
          linkLetterboxd: t.screening.linkLetterboxd,
          linkTrailer: t.screening.linkTrailer,
        }}
      />
      <p className="font-pixel-cjk text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-6">
        {room.name} · {dateStr} · {isAdmin ? t.screening.adminViewSeatMapHint : t.screening.tapToClaim}
      </p>
      {isPast && userHasReservation && (
        <p className="font-mono text-[10px] text-[#888888] mb-4">
          <a href="/receipt" className="text-[#e8c84a] hover:underline">
            {t.screening.exportViewingReceipt}
          </a>
        </p>
      )}
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
      {isAdmin && (
        <AdminScreeningGuests
          screeningId={id}
          reservations={(reservations ?? []) as unknown as Parameters<typeof AdminScreeningGuests>[0]['reservations']}
          labels={{
            title: t.admin.guestsTitle,
            addGuest: t.admin.guestsAddHint,
            displayNamePlaceholder: t.admin.guestsDisplayNamePlaceholder,
            addButton: t.admin.guestsAddButton,
            displayNameNotFound: t.admin.guestsDisplayNameNotFound,
            displayNameAmbiguous: t.admin.guestsDisplayNameAmbiguous,
            pickCandidate: t.admin.guestsPickCandidate,
            userMissingWechat: t.admin.guestsMissingWechat,
            userAlreadyReserved: t.admin.guestsAlreadyReserved,
            noSeatsAvailable: t.admin.guestsNoSeats,
            remove: t.admin.guestsRemove,
            removalMessageLabel: t.admin.guestsRemovalMessageLabel,
            removalMessagePlaceholder: t.admin.guestsRemovalMessagePlaceholder,
            confirmRemove: t.admin.guestsConfirmRemove,
            cancel: t.admin.guestsCancel,
            guestsEmpty: t.admin.guestsEmpty,
            noShow: t.admin.noShow,
            noShowColumn: t.admin.noShowColumn,
            seatsCount: t.admin.seatsCount,
            saveFailed: t.admin.attendanceSaveFailed,
            reservationsNotUpdated: t.admin.attendanceReservationsNotUpdated,
            actionFailed: t.admin.guestsActionFailed,
            contactLineLabels: {
              wechat: t.admin.contactIdLabelWechat,
              whatsapp: t.admin.contactIdLabelWhatsapp,
              instagram: t.admin.contactIdLabelInstagram,
              discord: t.admin.contactIdLabelDiscord,
            },
          }}
        />
      )}
      <div className="border border-[#e8c84a] bg-[#0f0f0f] p-4 md:p-6" style={{ borderRadius: 0 }}>
        <ScreeningSeatMapWrapper
          screeningId={screening.id}
          filmTitle={base.title}
          filmTitleEn={altRow?.title_en ?? null}
          room={{
            furniture: furniture as Parameters<typeof SeatMap>[0]['room']['furniture'],
            decorations: decorations as Parameters<typeof SeatMap>[0]['room']['decorations'],
            canvasW: room.canvas_w ?? 600,
            canvasH: room.canvas_h ?? 400,
            roomBackgroundId: room.room_background_id ?? 'warm',
          }}
          squeezeNote={screening.squeeze_note}
          initialReservations={(reservations ?? []) as unknown as Parameters<typeof SeatMap>[0]['initialReservations']}
          initialWaitlist={(waitlist ?? []) as unknown as Parameters<typeof SeatMap>[0]['initialWaitlist']}
          waitlistMode={(screening.waitlist_mode as 'auto' | 'manual') ?? 'auto'}
          currentUser={user ? { id: user.id } : null}
          currentUserProfile={
            userProfile
              ? {
                  wechat_id: userProfile.wechat_id,
                  contact_platform: userProfile.contact_platform,
                  contact_id: userProfile.contact_id,
                  no_show_count: userProfile.no_show_count ?? 0,
                }
              : null
          }
          isAdmin={isAdmin}
          testSqueeze={testSqueeze}
        />
      </div>
    </div>
    </ScreeningRedirect>
  );
}
