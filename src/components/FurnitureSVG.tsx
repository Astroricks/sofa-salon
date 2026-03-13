'use client';

import React from 'react';
import {
  FurniturePiece,
  lSofaSeatSplit,
  type FurnitureType,
} from '@/lib/furniture';

function lighten(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + Math.round((255 * pct) / 100));
  const g = Math.min(255, ((n >> 8) & 0xff) + Math.round((255 * pct) / 100));
  const b = Math.min(255, (n & 0xff) + Math.round((255 * pct) / 100));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function darken(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - Math.round((255 * pct) / 100));
  const g = Math.max(0, ((n >> 8) & 0xff) - Math.round((255 * pct) / 100));
  const b = Math.max(0, (n & 0xff) - Math.round((255 * pct) / 100));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function bw(p: FurniturePiece): number {
  if (p.type === 'sofa') return p.seats * 52;
  if (p.type === 'sofa-l') return lSofaSeatSplit(p.seats)[0] * 52;
  if (p.type === 'chair') return 44;
  if (p.type === 'bench') return 36;
  if (p.type === 'floor') return 40;
  return 32;
}

function bh(p: FurniturePiece): number {
  if (p.type === 'sofa') return 56;
  if (p.type === 'sofa-l') {
    const shortN = lSofaSeatSplit(p.seats)[1];
    const shortH = shortN * 52;
    const longBarH = 56;
    const shortAboveGap = 6;
    return p.lOrientation?.includes('top') ? longBarH + shortH + shortAboveGap : longBarH + shortH;
  }
  if (p.type === 'chair') return 44;
  if (p.type === 'bench') return 30;
  if (p.type === 'floor') return 40;
  return 32;
}

function SofaShape({ piece }: { piece: FurniturePiece }) {
  const { x, y, color, seats } = piece;
  const seatW = 52;
  const totalW = seatW * seats;
  const left = x - totalW / 2;
  const top = y - 28;
  const dark = darken(color, 30);
  const light = lighten(color, 15);

  return (
    <>
      <rect
        x={left + 4}
        y={top + 4}
        width={totalW}
        height={52}
        fill="#00000030"
        rx={2}
      />
      <rect x={left} y={top} width={totalW} height={20} fill={light} rx={2} />
      <rect
        x={left + 4}
        y={top + 1}
        width={totalW - 8}
        height={6}
        fill={lighten(color, 25)}
        rx={1}
      />
      <rect x={left} y={top + 18} width={totalW} height={3} fill={dark} />
      <rect x={left} y={top + 18} width={6} height={34} fill={light} />
      <rect x={left + totalW - 6} y={top + 18} width={6} height={34} fill={light} />
      {Array.from({ length: seats }, (_, i) => (
        <g key={i}>
          <rect
            x={left + 6 + i * seatW}
            y={top + 21}
            width={seatW - 2}
            height={28}
            fill={color}
            rx={1}
          />
          <rect
            x={left + 10 + i * seatW}
            y={top + 25}
            width={seatW - 10}
            height={8}
            fill={lighten(color, 10)}
            opacity={0.5}
            rx={1}
          />
          <rect
            x={left + 6 + i * seatW}
            y={top + 47}
            width={seatW - 2}
            height={4}
            fill={dark}
          />
          {i < seats - 1 && (
            <rect
              x={left + 6 + (i + 1) * seatW - 1}
              y={top + 21}
              width={2}
              height={28}
              fill={dark}
            />
          )}
        </g>
      ))}
      <rect x={left} y={top + 49} width={totalW} height={3} fill={dark} />
      <rect x={left + 6} y={top + 50} width={8} height={6} fill={darken(color, 50)} />
      <rect
        x={left + totalW - 14}
        y={top + 50}
        width={8}
        height={6}
        fill={darken(color, 50)}
      />
    </>
  );
}

function SofaLShape({ piece }: { piece: FurniturePiece }) {
  const { x, y, color, seats, lOrientation = 'bottom-right' } = piece;
  const [longN, shortN] = lSofaSeatSplit(seats);
  const seatW = 52;
  const longW = longN * seatW;
  const shortH = shortN * seatW;
  const left = x - longW / 2;
  const top = y - 28;
  const dark = darken(color, 30);
  const light = lighten(color, 15);
  const shortOnRight = lOrientation.includes('right');
  const shortOnBottom = lOrientation.includes('bottom');
  const shortX = shortOnRight ? left + longW - seatW : left;
  // Short bar: below long bar (top+52) for bottom-*, above long bar (top - shortH - 6) for top-*. 6px so first cushion center aligns with seat position y±57.
  const shortBarY = shortOnBottom ? top + 52 : top - shortH - 6;

  return (
    <>
      <rect
        x={left + 4}
        y={top + 4}
        width={longW}
        height={52}
        fill="#00000030"
        rx={2}
      />
      <rect x={left} y={top} width={longW} height={20} fill={light} rx={2} />
      <rect
        x={left + 4}
        y={top + 1}
        width={longW - 8}
        height={6}
        fill={lighten(color, 25)}
        rx={1}
      />
      <rect x={left} y={top + 18} width={longW} height={3} fill={dark} />
      <rect
        x={shortOnRight ? left : left + longW - 6}
        y={top + 18}
        width={6}
        height={34}
        fill={light}
      />
      {Array.from({ length: longN }, (_, i) => (
        <g key={i}>
          <rect
            x={left + 6 + i * seatW}
            y={top + 21}
            width={seatW - 2}
            height={28}
            fill={color}
            rx={1}
          />
          <rect
            x={left + 10 + i * seatW}
            y={top + 25}
            width={seatW - 10}
            height={8}
            fill={lighten(color, 10)}
            opacity={0.5}
            rx={1}
          />
          <rect
            x={left + 6 + i * seatW}
            y={top + 47}
            width={seatW - 2}
            height={4}
            fill={dark}
          />
          {i < longN - 1 && (
            <rect
              x={left + 6 + (i + 1) * seatW - 1}
              y={top + 21}
              width={2}
              height={28}
              fill={dark}
            />
          )}
        </g>
      ))}
      <rect x={left} y={top + 49} width={longW} height={3} fill={dark} />
      {shortN > 0 && (
        <>
          <rect
            x={shortX + 4}
            y={shortBarY + 4}
            width={seatW}
            height={shortH}
            fill="#00000030"
            rx={2}
          />
          <rect
            x={shortOnRight ? shortX + seatW - 20 : shortX}
            y={shortBarY}
            width={20}
            height={shortH}
            fill={light}
            rx={2}
          />
          {Array.from({ length: shortN }, (_, i) => (
            <rect
              key={i}
              x={shortOnRight ? shortX : shortX + 20}
              y={shortBarY + 4 + i * seatW}
              width={seatW - 20}
              height={seatW - 2}
              fill={color}
              rx={1}
            />
          ))}
          <rect
            x={shortX}
            y={shortBarY + shortH + 2}
            width={seatW}
            height={3}
            fill={dark}
          />
          <rect
            x={shortX + 6}
            y={shortBarY + shortH + 4}
            width={8}
            height={6}
            fill={darken(color, 50)}
          />
        </>
      )}
      <rect
        x={left + longW - 14}
        y={top + 50}
        width={8}
        height={6}
        fill={darken(color, 50)}
      />
    </>
  );
}

function ChairShape({ piece }: { piece: FurniturePiece }) {
  const { x, y, color } = piece;
  const dark = darken(color, 30);
  const light = lighten(color, 20);
  return (
    <>
      <rect
        x={x - 22 + 4}
        y={y - 20 + 4}
        width={44}
        height={44}
        fill="#00000030"
        rx={2}
      />
      <rect x={x - 22} y={y - 20} width={44} height={14} fill={light} rx={2} />
      <rect
        x={x - 18}
        y={y - 19}
        width={36}
        height={5}
        fill={lighten(color, 30)}
        rx={1}
      />
      <rect x={x - 20} y={y - 8} width={40} height={30} fill={color} rx={1} />
      <rect
        x={x - 16}
        y={y - 4}
        width={32}
        height={8}
        fill={lighten(color, 10)}
        opacity={0.5}
        rx={1}
      />
      <rect x={x - 20} y={y + 20} width={40} height={4} fill={dark} />
      <rect x={x - 22} y={y - 6} width={4} height={26} fill={light} />
      <rect x={x + 18} y={y - 6} width={4} height={26} fill={light} />
      <rect x={x - 20} y={y + 22} width={6} height={6} fill={darken(color, 50)} />
      <rect x={x + 14} y={y + 22} width={6} height={6} fill={darken(color, 50)} />
    </>
  );
}

function BenchShape({ piece }: { piece: FurniturePiece }) {
  const { x, y, color } = piece;
  const dark = darken(color, 30);
  return (
    <>
      <rect
        x={x - 18 + 3}
        y={y - 12 + 3}
        width={36}
        height={26}
        fill="#00000030"
        rx={1}
      />
      <rect x={x - 18} y={y - 12} width={36} height={26} fill={color} rx={1} />
      <rect
        x={x - 14}
        y={y - 9}
        width={28}
        height={6}
        fill={lighten(color, 12)}
        opacity={0.5}
        rx={1}
      />
      <rect x={x - 18} y={y + 12} width={36} height={3} fill={dark} />
      <rect x={x - 16} y={y + 14} width={5} height={5} fill={dark} />
      <rect x={x + 11} y={y + 14} width={5} height={5} fill={dark} />
    </>
  );
}

function CushionShape({ piece }: { piece: FurniturePiece }) {
  const { x, y, color } = piece;
  return (
    <>
      <rect
        x={x - 16 + 3}
        y={y - 14 + 3}
        width={32}
        height={28}
        fill="#00000030"
        rx={3}
      />
      <rect x={x - 16} y={y - 14} width={32} height={28} fill={color} rx={3} />
      <rect
        x={x - 12}
        y={y - 10}
        width={24}
        height={8}
        fill={lighten(color, 15)}
        opacity={0.5}
        rx={2}
      />
      <rect
        x={x - 2}
        y={y}
        width={4}
        height={4}
        fill={darken(color, 20)}
        rx={1}
      />
      <rect
        x={x - 16}
        y={y - 14}
        width={32}
        height={3}
        fill={lighten(color, 10)}
        opacity={0.4}
        rx={3}
      />
    </>
  );
}

/** Floor seat: sit on the ground (e.g. mat / spot). */
function FloorShape({ piece }: { piece: FurniturePiece }) {
  const { x, y, color } = piece;
  const dark = darken(color, 25);
  const light = lighten(color, 12);
  const r = 18;
  return (
    <>
      <circle cx={x} cy={y} r={r + 3} fill="#00000030" />
      <circle cx={x} cy={y} r={r} fill={color} />
      <ellipse cx={x} cy={y - 4} rx={r * 0.7} ry={r * 0.25} fill={light} opacity={0.6} />
      <circle cx={x} cy={y} r={r} fill="none" stroke={dark} strokeWidth={2} />
    </>
  );
}

interface Props {
  piece: FurniturePiece;
  selected?: boolean;
  onSelect?: () => void;
}

function FurnitureSVG({ piece, selected, onSelect }: Props) {
  const { type, x, y, rotation } = piece;
  const groupStyle = {
    transform: `rotate(${rotation}deg)`,
    transformOrigin: `${x}px ${y}px`,
    cursor: onSelect ? 'pointer' : 'default',
  };

  const sel = selected ? (
    <rect
      x={x - bw(piece) / 2 - 4}
      y={y - bh(piece) / 2 - 4}
      width={bw(piece) + 8}
      height={bh(piece) + 8}
      fill="none"
      stroke="#e8c84a"
      strokeWidth={2}
      strokeDasharray="4 2"
    />
  ) : null;

  return (
    <g style={groupStyle} onClick={onSelect}>
      {sel}
      {type === 'sofa' && <SofaShape piece={piece} />}
      {type === 'sofa-l' && <SofaLShape piece={piece} />}
      {type === 'chair' && <ChairShape piece={piece} />}
      {type === 'bench' && <BenchShape piece={piece} />}
      {type === 'cushion' && <CushionShape piece={piece} />}
      {type === 'floor' && <FloorShape piece={piece} />}
    </g>
  );
}

export default React.memo(FurnitureSVG);
