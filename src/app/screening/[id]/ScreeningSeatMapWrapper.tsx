'use client';

import { useRouter } from 'next/navigation';
import SeatMap from '@/components/SeatMap';
import { useLocale } from '@/components/LocaleProvider';
import { screeningDisplayTitle } from '@/lib/screening-display';

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

type SeatMapRoom = Parameters<typeof SeatMap>[0]['room'];

interface Props {
  screeningId: string;
  filmTitle: string;
  filmTitleEn?: string | null;
  room: SeatMapRoom;
  seatLimit: number | null;
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
  isAdmin: boolean;
  testSqueeze?: boolean;
}

export default function ScreeningSeatMapWrapper({
  filmTitle,
  filmTitleEn,
  ...rest
}: Props) {
  const router = useRouter();
  const { locale } = useLocale();
  const screeningTitle = screeningDisplayTitle(locale, filmTitle, filmTitleEn);
  return (
    <SeatMap
      {...rest}
      screeningTitle={screeningTitle}
      onReservationsChange={() => router.refresh()}
    />
  );
}
