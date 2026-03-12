'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ScreeningCard from '@/components/ScreeningCard';
import SeatMapInline from '@/components/SeatMapInline';

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

const CARD_WIDTH = 280;
const CARD_GAP = 16;
const CARD_HEIGHT = 200;
const SEATMAP_MIN_HEIGHT = '70vh';
const MOBILE_BREAKPOINT = 768;

export default function HomeContent({ screenings, openId }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(openId);
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
  }, [screenings.length, selectedId]);

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
  }, [updateScrollState, screenings.length]);

  const scrollBy = (direction: 'left' | 'right') => {
    const el = carouselRef.current;
    if (!el) return;
    const step = CARD_WIDTH + CARD_GAP;
    el.scrollBy({ left: direction === 'right' ? step : -step, behavior: 'smooth' });
  };

  const selectedScreening = screenings.find((s) => s.id === selectedId);
  const showNavButtons = isMobile && screenings.length > 1;

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
                  screening_at: s.screening_at,
                  description: s.description,
                  room_id: s.room_id,
                  year: s.year,
                  director: s.director,
                  duration_minutes: s.duration_minutes,
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

      {/* Seat map: full width below carousel, not inside any card */}
      <section
        style={{
          width: '100%',
          minHeight: SEATMAP_MIN_HEIGHT,
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
