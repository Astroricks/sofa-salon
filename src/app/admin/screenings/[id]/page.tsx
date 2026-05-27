import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import { getT, type Locale } from '@/lib/i18n';
import { fetchScreeningAltLocaleByIds } from '@/lib/screening-alt-locale-fetch';
import AdminScreeningGuests from '@/components/AdminScreeningGuests';
import EditScreeningForm from './EditScreeningForm';

export default async function EditScreeningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const cookieStore = await cookies();
  const locale: Locale = cookieStore.get('sofa-salon-locale')?.value === 'zh' ? 'zh' : 'en';
  const t = getT(locale);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return (
      <div className="p-8 font-mono text-[13px] text-[#f87171]">
        {t.admin.adminOnly}
      </div>
    );
  }

  const { data: screening } = await supabase
    .from('screenings')
    .select(
      'id, title, description, screening_at, room_id, squeeze_note, waitlist_mode, is_active, year, director, duration_minutes, douban_url, letterboxd_url, trailer_url'
    )
    .eq('id', id)
    .single();

  if (!screening) notFound();

  const altLocaleById = await fetchScreeningAltLocaleByIds(supabase, [id]);
  const alt = altLocaleById[id];

  const isPast = new Date(screening.screening_at ?? '') < new Date();

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name')
    .order('name');

  const admin = createAdminClient();
  const RESERVATION_SELECT =
    'id, seat_key, user_id, is_ghost, attended, profiles(display_name, wechat_id, contact_platform, contact_id)';
  const { data: guestReservations } = admin
    ? await admin
        .from('reservations')
        .select(RESERVATION_SELECT)
        .eq('screening_id', id)
        .order('created_at', { ascending: true })
    : { data: [] };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 bg-[#0f0f0f]">
      <EditScreeningForm
        screening={{
          id: screening.id,
          title: screening.title ?? '',
          description: screening.description ?? '',
          douban_url: (screening as { douban_url?: string | null }).douban_url ?? '',
          letterboxd_url: (screening as { letterboxd_url?: string | null }).letterboxd_url ?? '',
          trailer_url: (screening as { trailer_url?: string | null }).trailer_url ?? '',
          screening_at: screening.screening_at ?? '',
          room_id: screening.room_id ?? '',
          squeeze_note: screening.squeeze_note ?? '',
          waitlist_mode: (screening.waitlist_mode as 'auto' | 'manual') ?? 'auto',
          is_active: screening.is_active ?? true,
          year: (screening as { year?: number | null }).year ?? undefined,
          director: (screening as { director?: string | null }).director ?? undefined,
          duration_minutes: (screening as { duration_minutes?: number | null }).duration_minutes ?? undefined,
          title_en: alt?.title_en ?? undefined,
          director_en: alt?.director_en ?? undefined,
        }}
        rooms={rooms ?? []}
        isPast={isPast}
      />
      <AdminScreeningGuests
        screeningId={id}
        isPast={isPast}
        reservations={
          (guestReservations ?? []) as unknown as Parameters<
            typeof AdminScreeningGuests
          >[0]['reservations']
        }
        labels={{
          title: t.admin.guestsTitle,
          addGuest: t.admin.guestsAddHint,
          pastHint: t.admin.guestsPastHint,
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
          catalogSeat: t.admin.guestsCatalogSeat,
          removePast: t.admin.guestsRemovePast,
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
    </div>
  );
}
