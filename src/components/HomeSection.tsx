'use client';

import { useLocale } from '@/components/LocaleProvider';
import HomeContent from '@/components/HomeContent';

interface Screening {
  id: string;
  title: string;
  screening_at: string;
  description?: string;
  room_id?: string;
  year?: number;
  director?: string;
  duration_minutes?: number;
  reservedCount: number;
  totalSeats?: number;
}

interface Props {
  screenings: Screening[];
  openId: string | null;
}

export default function HomeSection({ screenings, openId }: Props) {
  const { t } = useLocale();

  return (
    <>
      <div className="section-label">{t.home.sectionLabel}</div>
      <p className="film-meta" style={{ marginBottom: 24 }}>
        {screenings.length} {t.home.upcoming}
      </p>
      {screenings.length ? (
        <HomeContent screenings={screenings} openId={openId} />
      ) : (
        <div style={{ border: '1px dashed #2a2a2a', padding: '48px 20px', textAlign: 'center' }}>
          <p className="film-meta">{t.home.noScreenings}</p>
        </div>
      )}
    </>
  );
}
