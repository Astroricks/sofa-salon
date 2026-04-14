'use client';

import { DoubanMark, LetterboxdMark } from '@/components/ScreeningLinkIcons';
import { useLocale } from '@/components/LocaleProvider';
import { screeningDisplayDirector, screeningDisplayTitle } from '@/lib/screening-display';
import { safeHttpUrl } from '@/lib/safe-http-url';

interface Screening {
  id: string;
  title: string;
  title_en?: string;
  screening_at: string;
  description?: string;
  room_id?: string;
  year?: number;
  director?: string;
  director_en?: string;
  duration_minutes?: number;
  douban_url?: string | null;
  letterboxd_url?: string | null;
}

interface Props {
  screening: Screening;
  reservedCount: number;
  totalSeats?: number;
  selected?: boolean;
  onSelect: () => void;
  cardWidth?: number;
  cardHeight?: number;
}

export default function ScreeningCard({
  screening,
  reservedCount,
  totalSeats,
  selected = false,
  onSelect,
  cardWidth = 280,
  cardHeight = 200,
}: Props) {
  const { t, locale } = useLocale();
  const displayTitle = screeningDisplayTitle(locale, screening.title, screening.title_en);
  const displayDirector = screeningDisplayDirector(locale, screening.director, screening.director_en);
  const date = new Date(screening.screening_at);
  const dateStr = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timeStr = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isFull = totalSeats !== undefined && reservedCount >= totalSeats;
  const available = totalSeats !== undefined ? totalSeats - reservedCount : null;

  const metaParts = [
    screening.year,
    displayDirector || null,
    screening.duration_minutes ? `${screening.duration_minutes} min` : null,
  ].filter(Boolean);

  const doubanHref = safeHttpUrl(screening.douban_url);
  const letterboxdHref = safeHttpUrl(screening.letterboxd_url);
  const linkIconClass =
    'flex shrink-0 items-center justify-center opacity-90 ring-1 ring-transparent transition hover:opacity-100 hover:ring-[#e8c84a]/35 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#e8c84a]/60';

  return (
    <div
      className={`screening-card ${selected ? 'active' : ''}`}
      onClick={onSelect}
      style={{
        position: 'relative',
        paddingLeft: 14,
        width: cardWidth,
        height: cardHeight,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: selected ? 'var(--gold)' : '#2a2a2a',
          transition: 'background 0.15s',
        }}
      />

      <div className="card-header" style={{ flexShrink: 0 }}>
        <div>
          <div className="card-date">
            {dateStr.toUpperCase()} · {timeStr}
          </div>
        </div>
        <span
          className={`seats-badge ${
            isFull ? 'full' : available !== null && available <= 2 ? 'few' : 'open'
          }`}
        >
          {isFull ? t.home.full : available !== null ? `${available} ${t.home.left}` : t.home.open}
        </span>
      </div>

      <div
        className="card-body"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="film-title truncate" title={displayTitle}>
          {displayTitle}
        </div>
        {metaParts.length > 0 && (
          <div className="film-meta truncate" title={metaParts.join(' · ')}>
            {metaParts.join(' · ').toUpperCase()}
          </div>
        )}
        {(doubanHref || letterboxdHref) && (
          <div
            className="mt-0.5 mb-3 flex flex-wrap items-center gap-1"
            data-testid="screening-card-external-icons"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {doubanHref ? (
              <a
                href={doubanHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkIconClass} overflow-hidden rounded-[4px]`}
                aria-label={t.screening.linkDouban}
                onClick={(e) => e.stopPropagation()}
              >
                <DoubanMark size="sm" />
              </a>
            ) : null}
            {letterboxdHref ? (
              <a
                href={letterboxdHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkIconClass} h-5 w-5 overflow-hidden rounded-full bg-inherit`}
                aria-label={t.screening.linkLetterboxd}
                onClick={(e) => e.stopPropagation()}
              >
                <LetterboxdMark size="sm" />
              </a>
            ) : null}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            marginTop: 'auto',
          }}
        >
          <div className="seat-preview">
            {totalSeats !== undefined &&
              Array.from({ length: totalSeats }, (_, i) => (
                <div
                  key={i}
                  className={`seat-dot ${
                    i < reservedCount ? 'taken' : 'available'
                  }`}
                />
              ))}
          </div>
          {totalSeats !== undefined && (
            <span className="film-meta" style={{ marginBottom: 0 }}>
              {reservedCount}/{totalSeats}
            </span>
          )}
          <span
            className="film-meta"
            style={{
              marginLeft: 'auto',
              color: selected ? 'var(--gold)' : '#444',
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            {selected ? t.home.selectedSeat : t.home.selectSeat}
          </span>
        </div>
      </div>
    </div>
  );
}
