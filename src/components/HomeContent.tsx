'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import {
  prefetchSeatmap,
  seedSeatmapCache,
  type SeatmapApiPayload,
} from '@/lib/seatmap-client-cache';
import ScreeningCard from '@/components/ScreeningCard';
import SeatMapInline from '@/components/SeatMapInline';
interface Screening {
  id: string;
  title: string;
  title_en?: string;
  screening_at: string;
  description?: string;
  douban_url?: string;
  letterboxd_url?: string;
  trailer_url?: string;
  room_id?: string;
  year?: number;
  director?: string;
  director_en?: string;
  duration_minutes?: number;
  reservedCount: number;
  totalSeats?: number;
}

interface Props {
  screenings: Screening[];
  openId: string | null;
  initialSeatmapById?: Record<string, SeatmapApiPayload>;
}

const CARD_WIDTH = 280;
const CARD_GAP = 16;
/** Taller than before to fit optional Douban / Letterboxd icon row under credits. */
const CARD_HEIGHT = 218;
const MOBILE_BREAKPOINT = 768;

export default function HomeContent({ screenings, openId, initialSeatmapById }: Props) {
  const { t } = useLocale();
  const seatmapSeeded = useRef(false);
  if (initialSeatmapById && !seatmapSeeded.current) {
    seedSeatmapCache(initialSeatmapById);
    seatmapSeeded.current = true;
  }

  const [selectedId, setSelectedId] = useState<string | null>(
    openId ?? screenings[0]?.id ?? null
  );
  const [isMobile, setIsMobile] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const updateScrollState = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const threshold = 4;
    setCanScrollLeft(scrollLeft > threshold);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - threshold);
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (openId) setSelectedId(openId);
  }, [openId]);

  useEffect(() => {
    if (screenings.length > 0 && !selectedId) {
      setSelectedId(screenings[0].id);
    }
  }, [screenings, selectedId]);

  // Warm seatmap cache for other carousel cards (switch feels instant after first load).
  useEffect(() => {
    for (const s of screenings) {
      if (s.id !== selectedId) prefetchSeatmap(s.id);
    }
  }, [screenings, selectedId]);

  useEffect(() => {
    updateScrollState();
    const el = carouselRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState);
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, screenings]);

  const scrollBy = (direction: 'left' | 'right') => {
    const el = carouselRef.current;
    if (!el) return;
    const step = CARD_WIDTH + CARD_GAP;
    el.scrollBy({ left: direction === 'right' ? step : -step, behavior: 'smooth' });
  };

  const selectedScreening = screenings.find((s) => s.id === selectedId);
  const showNavButtons = isMobile && screenings.length > 1;
  const selectedHasFilmNotes = Boolean(selectedScreening?.description?.trim());

  return (
    <div style={{ width: '90vw', maxWidth: 1100, margin: '0 auto' }}>
      {/* Carousel: horizontal scroll */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <div
          ref={carouselRef}
          style={{
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollSnapType: 'x mandatory',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
            display: 'flex',
            gap: CARD_GAP,
            paddingBottom: 8,
          }}
          className="carousel-scroll"
        >
          {screenings.map((s) => (
            <div
              key={s.id}
              style={{
                scrollSnapAlign: 'start',
                scrollSnapStop: 'always',
                width: CARD_WIDTH,
                flexShrink: 0,
              }}
            >
              <ScreeningCard
                cardWidth={CARD_WIDTH}
                cardHeight={CARD_HEIGHT}
                screening={{
                  id: s.id,
                  title: s.title,
                  title_en: s.title_en,
                  screening_at: s.screening_at,
                  description: s.description,
                  room_id: s.room_id,
                  year: s.year,
                  director: s.director,
                  director_en: s.director_en,
                  duration_minutes: s.duration_minutes,
                  douban_url: s.douban_url,
                  letterboxd_url: s.letterboxd_url,
                  trailer_url: s.trailer_url,
                }}
                reservedCount={s.reservedCount}
                totalSeats={s.totalSeats}
                selected={selectedId === s.id}
                onSelect={() => setSelectedId(s.id)}
              />
            </div>
          ))}
        </div>

        {/* Mobile only: floating scroll buttons when more cards are off-screen */}
        {showNavButtons && (
          <>
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollBy('left')}
                aria-label="Scroll left"
                className="carousel-nav-btn carousel-nav-left"
                style={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: '2px solid var(--gold)',
                  background: 'rgba(17,17,17,0.9)',
                  color: 'var(--gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  zIndex: 10,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}
              >
                ←
              </button>
            )}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollBy('right')}
                aria-label="Scroll right"
                className="carousel-nav-btn carousel-nav-right"
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: '2px solid var(--gold)',
                  background: 'rgba(17,17,17,0.9)',
                  color: 'var(--gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  zIndex: 10,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}
              >
                →
              </button>
            )}
          </>
        )}
      </div>

      {selectedScreening && selectedHasFilmNotes ? (
        <section
          style={{
            width: '100%',
            maxWidth: 1100,
            margin: '0 auto 20px',
            padding: '16px 20px',
            boxSizing: 'border-box',
          }}
        >
          <h2
            className="font-mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#888',
              marginBottom: 10,
            }}
          >
            {t.screening.filmNotes}
          </h2>
          <p
            className="font-mono whitespace-pre-wrap"
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: '#c8c4bc',
              margin: 0,
            }}
          >
            {(selectedScreening.description ?? '').trim()}
          </p>
        </section>
      ) : null}

      {/* Seat map: full width below carousel, not inside any card */}
      <section
        style={{
          width: '100%',
          background: 'var(--black)',
          border: '2px solid var(--gold)',
          padding: 24,
          boxSizing: 'border-box',
        }}
        className="seat-map-section"
      >
        {selectedScreening ? (
          <SeatMapInline
            screeningId={selectedScreening.id}
            roomId={selectedScreening.room_id}
          />
        ) : (
          <p
            className="film-meta"
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: '#555',
              letterSpacing: 2,
            }}
          >
            点击上方活动选座 · Select an event above to see seats
          </p>
        )}
      </section>
    </div>
  );
}
