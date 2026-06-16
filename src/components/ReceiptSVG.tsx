'use client';

/**
 * ReceiptSVG — Renders a stylised receipt (paper + pigeon mascot) from ReceiptData.
 * Responsive: different viewBox for mobile/desktop. Used on /receipt and by ReceiptExportButton for PNG export.
 */
import { useState, useEffect } from 'react';
import type { ReceiptData } from '@/app/receipt/page';
import {
  APP_NAME,
  HOST_NAME,
  RECEIPT_SUBTITLE,
  VENUE_ADDRESS,
} from '@/lib/config';
import { useLocale } from '@/components/LocaleProvider';

const PAPER_WIDTH = 200;
const PAPER_BASE_HEIGHT = 500;
const PER_FILM_HEIGHT = 58;
const VIEWBOX_WIDTH_DESKTOP = 680;
const VIEWBOX_WIDTH_MOBILE = 340;

const PAPER_FILL = '#f5f0e8';
const BG_FILL = '#0f0f0f';
const FONT = "'Courier New', monospace";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      if (typeof window === 'undefined') return;
      setIsMobile(window.innerWidth < 768);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

function JaggedEdge({ paperLeft, y, count = 17 }: { paperLeft: number; y: number; count?: number }) {
  const squares = [];
  for (let i = 0; i < count; i++) {
    squares.push(
      <rect key={i} x={paperLeft + i * 12} y={y} width={6} height={6} fill={BG_FILL} />
    );
  }
  return <>{squares}</>;
}

function EyesAndBeak({ centerX, paperTop }: { centerX: number; paperTop: number }) {
  const leftEyeX = centerX - 36;
  const rightEyeX = centerX + 14;
  const eyeY = paperTop + 16;
  const beakTopY = eyeY + 16;
  return (
    <>
      <rect x={leftEyeX} y={eyeY} width={22} height={22} fill="#c09020" />
      <rect x={leftEyeX + 4} y={eyeY + 4} width={14} height={14} fill="#1a1a1a" />
      <rect x={leftEyeX + 5} y={eyeY + 5} width={4} height={4} fill="#f5f0e8" />
      <rect x={rightEyeX} y={eyeY} width={22} height={22} fill="#c09020" />
      <rect x={rightEyeX + 4} y={eyeY + 4} width={14} height={14} fill="#1a1a1a" />
      <rect x={rightEyeX + 5} y={eyeY + 5} width={4} height={4} fill="#f5f0e8" />
      <rect x={centerX - 7} y={beakTopY} width={14} height={6} fill="#c04018" />
      <rect x={centerX - 4} y={beakTopY + 6} width={8} height={4} fill="#c04018" />
      <rect x={centerX - 2} y={beakTopY + 10} width={4} height={3} fill="#a03010" />
    </>
  );
}

function SeparatorDashes({ paperLeft, y }: { paperLeft: number; y: number }) {
  return (
    <text x={paperLeft + 10} y={y} fontFamily={FONT} fontSize={7} fill="#ccc" letterSpacing={1}>
      - - - - - - - - - - - - - - - - -
    </text>
  );
}

function DottedLine({ paperLeft, y }: { paperLeft: number; y: number }) {
  return (
    <text x={paperLeft + 10} y={y} fontFamily={FONT} fontSize={7} fill="#ddd" letterSpacing={1}>
      · · · · · · · · · · · · · · · · ·
    </text>
  );
}

function Scissors({ x, y }: { x: number; y: number }) {
  return (
    <>
      <rect x={x} y={y} width={3} height={3} fill="#bbb" />
      <rect x={x + 3} y={y + 1} width={3} height={2} fill="#bbb" />
      <rect x={x + 6} y={y} width={3} height={3} fill="#bbb" />
      <rect x={x + 4} y={y - 1} width={2} height={5} fill="#bbb" />
    </>
  );
}

function PigeonFeet({ x, y }: { x: number; y: number }) {
  return (
    <>
      <rect x={x} y={y} width={3} height={6} fill="#c04018" />
      <rect x={x + 14} y={y} width={3} height={6} fill="#c04018" />
      <rect x={x - 5} y={y + 6} width={5} height={3} fill="#c04018" />
      <rect x={x} y={y + 6} width={6} height={3} fill="#c04018" />
      <rect x={x + 10} y={y + 6} width={6} height={3} fill="#c04018" />
      <rect x={x + 16} y={y + 6} width={5} height={3} fill="#c04018" />
    </>
  );
}

function formatDate(iso: string, locale: 'en' | 'zh'): string {
  const d = new Date(iso);
  if (locale === 'zh') return `${d.getMonth() + 1}月${d.getDate()}日`;
  const months = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}  ${h}:${min}`;
}

function barcodeWidths(): number[] {
  const w: number[] = [];
  for (let i = 0; i < 28; i++) w.push(i % 2 === 0 ? 2 : 4);
  return w;
}

export default function ReceiptSVG({ data }: { data: ReceiptData }) {
  const { t, locale } = useLocale();
  const isMobile = useIsMobile();
  const viewBoxWidth = isMobile ? VIEWBOX_WIDTH_MOBILE : VIEWBOX_WIDTH_DESKTOP;
  const paperLeft = (viewBoxWidth - PAPER_WIDTH) / 2;
  const centerX = viewBoxWidth / 2;
  const textLeft = paperLeft + 13;
  const textRight = paperLeft + PAPER_WIDTH - 13;

  const { displayName, films, totalScreenings, totalMinutes, avgRating, timesBailed, receiptNumber, generatedAt } = data;
  const paperHeight = PAPER_BASE_HEIGHT + films.length * PER_FILM_HEIGHT;
  const paperTop = 20;
  const totalHeight = paperTop + paperHeight + 26;

  const headerY = paperTop + 68;
  const sep1Y = headerY + 44;
  const session1Y = sep1Y + 13;
  const session2Y = session1Y + 11;
  const sep2Y = session2Y + 11;
  const colHeaderY = sep2Y + 12;
  const firstFilmY = colHeaderY + 14;

  const barWidths = barcodeWidths();
  const barcodeTotalW = barWidths.reduce((a, b) => a + b, 0) + 27;
  const barcodeStartX = centerX - barcodeTotalW / 2;
  const yyyymmdd = generatedAt.slice(0, 10).replace(/-/g, '');

  return (
    <svg
      id="receipt-svg"
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${viewBoxWidth} ${totalHeight}`}
      width="100%"
      style={{ maxWidth: isMobile ? viewBoxWidth : 960, background: BG_FILL }}
    >
      <rect width={viewBoxWidth} height={totalHeight} fill={BG_FILL} />
      <rect x={paperLeft} y={paperTop} width={PAPER_WIDTH} height={paperHeight} fill={PAPER_FILL} />
      <JaggedEdge paperLeft={paperLeft} y={paperTop} />
      <JaggedEdge paperLeft={paperLeft} y={paperTop + paperHeight - 6} />
      <EyesAndBeak centerX={centerX} paperTop={paperTop} />

      <text x={centerX} y={headerY} fontFamily={FONT} fontSize={13} fontWeight="bold" fill="#111" textAnchor="middle" letterSpacing={2}>{APP_NAME}</text>
      <text x={centerX} y={headerY + 12} fontFamily={FONT} fontSize={7} fill="#888" textAnchor="middle" letterSpacing={1}>{RECEIPT_SUBTITLE}</text>
      {VENUE_ADDRESS ? (
        <text x={centerX} y={headerY + 23} fontFamily={FONT} fontSize={7} fill="#bbb" textAnchor="middle">{VENUE_ADDRESS}</text>
      ) : null}
      <text x={centerX} y={headerY + 32} fontFamily={FONT} fontSize={7} fill="#888" textAnchor="middle">{displayName}</text>

      <SeparatorDashes paperLeft={paperLeft} y={sep1Y} />
      <text x={textLeft} y={session1Y} fontFamily={FONT} fontSize={7} fill="#555">{t.receipt.viewingRecord}</text>
      <text x={textRight} y={session1Y} fontFamily={FONT} fontSize={7} fill="#555" textAnchor="end">#{receiptNumber}</text>
      <text x={textLeft} y={session2Y} fontFamily={FONT} fontSize={7} fill="#888">{formatSessionDate(generatedAt)}</text>
      {HOST_NAME ? (
        <text x={textRight} y={session2Y} fontFamily={FONT} fontSize={7} fill="#888" textAnchor="end">{HOST_NAME.toUpperCase()}</text>
      ) : null}
      <SeparatorDashes paperLeft={paperLeft} y={sep2Y} />
      <text x={textLeft} y={colHeaderY} fontFamily={FONT} fontSize={7} fill="#777">{t.receipt.film}</text>
      <text x={centerX + 40} y={colHeaderY} fontFamily={FONT} fontSize={7} fill="#777" textAnchor="middle">{t.receipt.date}</text>
      <text x={textRight} y={colHeaderY} fontFamily={FONT} fontSize={7} fill="#777" textAnchor="end">{t.receipt.minutes}</text>

      {films.map((film, i) => {
        const blockY = firstFilmY + i * PER_FILM_HEIGHT;
        const starStr = film.rating != null ? '★'.repeat(film.rating) + '☆'.repeat(5 - film.rating) : '—';
        const directorYear = [film.director, film.year != null ? String(film.year) : ''].filter(Boolean).join('  ');
        return (
          <g key={film.screeningAt + film.seatKey + i}>
            <text x={textLeft} y={blockY} fontFamily={FONT} fontSize={8} fontWeight="bold" fill="#111">{film.title}</text>
            <text x={textLeft} y={blockY + 11} fontFamily={FONT} fontSize={7} fill="#888">{directorYear}</text>
            <text x={textRight} y={blockY + 11} fontFamily={FONT} fontSize={7} fill="#888" textAnchor="end">{film.durationMinutes ?? '—'}</text>
            <text x={textLeft} y={blockY + 22} fontFamily={FONT} fontSize={8} fill="#c8a000">{starStr}</text>
            <text x={textRight} y={blockY + 22} fontFamily={FONT} fontSize={7} fill="#aaa" textAnchor="end">{formatDate(film.screeningAt, locale)}</text>
            <DottedLine paperLeft={paperLeft} y={blockY + 32} />
            <Scissors x={textRight - 24} y={blockY + 26} />
          </g>
        );
      })}

      {(() => {
        const totalsStartY = firstFilmY + films.length * PER_FILM_HEIGHT + 8;
        return (
          <>
            <rect x={paperLeft + 4} y={totalsStartY} width={PAPER_WIDTH - 8} height={2} fill="#111" />
            <rect x={paperLeft + 4} y={totalsStartY + 6} width={PAPER_WIDTH - 8} height={1} fill="#111" />
            <text x={textLeft} y={totalsStartY + 18} fontFamily={FONT} fontSize={7} fill="#555">{t.receipt.screenings}</text>
            <text x={textRight} y={totalsStartY + 18} fontFamily={FONT} fontSize={8} fontWeight="bold" fill="#111" textAnchor="end">{totalScreenings}</text>
            <text x={textLeft} y={totalsStartY + 30} fontFamily={FONT} fontSize={7} fill="#555">{t.receipt.totalRuntime}</text>
            <text x={textRight} y={totalsStartY + 30} fontFamily={FONT} fontSize={8} fontWeight="bold" fill="#111" textAnchor="end">{totalMinutes} {t.receipt.minutes}</text>
            <text x={textLeft} y={totalsStartY + 42} fontFamily={FONT} fontSize={7} fill="#555">{t.receipt.averageRating}</text>
            <text x={textRight} y={totalsStartY + 42} fontFamily={FONT} fontSize={8} fontWeight="bold" fill="#c8a000" textAnchor="end">{avgRating != null ? `★ ${avgRating}` : '—'}</text>
            <text x={textLeft} y={totalsStartY + 54} fontFamily={FONT} fontSize={7} fill="#555">{t.receipt.timesBailed}</text>
            <text x={textRight} y={totalsStartY + 54} fontFamily={FONT} fontSize={8} fontWeight="bold" textAnchor="end" fill={timesBailed === 0 ? '#4a9a4a' : '#f87171'}>{timesBailed === 0 ? `0  ${t.receipt.clean}` : String(timesBailed)}</text>
          </>
        );
      })()}

      {(() => {
        const totalsStartY = firstFilmY + films.length * PER_FILM_HEIGHT + 8;
        const afterTotalsY = totalsStartY + 76;
        const barcodeLabelY = afterTotalsY;
        const barcodeY = barcodeLabelY + 14;
        const barcodeCodeY = barcodeY + 32;
        const footerSepY = barcodeCodeY + 14;
        const footer1Y = footerSepY + 16;
        const feetY = footer1Y + 24;
        return (
          <>
            <text x={centerX} y={barcodeLabelY} fontFamily={FONT} fontSize={7} fill="#888" textAnchor="middle">{t.receipt.scanToShare}</text>
            {barWidths.map((w, i) => {
              const x = barcodeStartX + barWidths.slice(0, i).reduce((a, b) => a + b + 1, 0);
              return <rect key={i} x={x} y={barcodeY} width={w} height={20} fill="#111" />;
            })}
            <text x={centerX} y={barcodeCodeY} fontFamily={FONT} fontSize={6} fill="#bbb" textAnchor="middle" letterSpacing={1}>Z1GGY-{yyyymmdd}-{receiptNumber}</text>
            <SeparatorDashes paperLeft={paperLeft} y={footerSepY} />
            <text x={centerX} y={footer1Y} fontFamily={FONT} fontSize={8} fill="#888" textAnchor="middle">{t.receipt.footerLine1}</text>
            <text x={centerX} y={footer1Y + 12} fontFamily={FONT} fontSize={8} fill="#888" textAnchor="middle">{t.receipt.footerLine2}</text>
            <PigeonFeet x={centerX - 10} y={feetY} />
          </>
        );
      })()}
    </svg>
  );
}
