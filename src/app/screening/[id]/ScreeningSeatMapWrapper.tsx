'use client';

import { useRouter } from 'next/navigation';
import SeatMap from '@/components/SeatMap';

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
  profiles: { display_name: string; avatar_config: unknown; wechat_id?: string | null; no_show_count?: number; attendance_count?: number } | null;
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
  screeningTitle: string;
  room: SeatMapRoom;
  squeezeNote: string | null;
  initialReservations: Reservation[];
  initialWaitlist: WaitlistEntry[];
  waitlistMode: 'auto' | 'manual';
  currentUser: { id: string } | null;
  currentUserProfile: { wechat_id: string | null; no_show_count?: number } | null;
  isAdmin: boolean;
  testSqueeze?: boolean;
}

export default function ScreeningSeatMapWrapper(props: Props) {
  const router = useRouter();
  return (
    <SeatMap
      {...props}
      onReservationsChange={() => router.refresh()}
    />
  );
}
