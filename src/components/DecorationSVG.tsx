'use client';

import React from 'react';
import type { Decoration } from '@/lib/furniture';

function PlantSVG({ x, y }: { x: number; y: number }) {
  return (
    <>
      <rect x={x - 10} y={y - 8} width={20} height={18} fill="#1e3a1a" rx={2} />
      <rect x={x - 7} y={y - 5} width={14} height={12} fill="#2a5020" />
      <rect x={x - 4} y={y - 18} width={8} height={16} fill="#3a6830" />
      <rect x={x - 11} y={y - 22} width={22} height={10} fill="#4a7838" />
      <rect
        x={x - 14}
        y={y - 19}
        width={10}
        height={8}
        fill="#3a6830"
        opacity={0.8}
      />
      <rect
        x={x + 5}
        y={y - 20}
        width={10}
        height={9}
        fill="#4a7838"
        opacity={0.8}
      />
    </>
  );
}

function LampSVG({ x, y }: { x: number; y: number }) {
  return (
    <>
      <rect x={x - 8} y={y + 2} width={16} height={4} fill="#3a3020" />
      <rect x={x - 3} y={y - 8} width={6} height={12} fill="#4a4030" />
      <rect x={x - 14} y={y - 14} width={28} height={8} fill="#c8a060" rx={4} />
      <rect
        x={x - 18}
        y={y + 4}
        width={36}
        height={20}
        fill="#c8a060"
        opacity={0.06}
        rx={4}
      />
    </>
  );
}

function SideTableSVG({ x, y }: { x: number; y: number }) {
  return (
    <>
      <rect
        x={x - 22}
        y={y - 20}
        width={54}
        height={54}
        fill="#00000030"
        rx={2}
      />
      <rect
        x={x - 26}
        y={y - 24}
        width={54}
        height={54}
        fill="#3d2e1a"
        rx={2}
      />
      <rect x={x - 22} y={y - 20} width={46} height={46} fill="#4a3820" rx={1} />
      <rect
        x={x - 20}
        y={y - 18}
        width={42}
        height={5}
        fill="#5a4830"
        opacity={0.4}
      />
      <rect x={x - 22} y={y + 22} width={6} height={8} fill="#2a1e0e" />
      <rect x={x + 16} y={y + 22} width={6} height={8} fill="#2a1e0e" />
      <PlantSVG x={x} y={y - 6} />
    </>
  );
}

function BookshelfSVG({ x, y }: { x: number; y: number }) {
  const colors = [
    '#8b0000',
    '#2a4fd6',
    '#3ab87a',
    '#e8c84a',
    '#7c3ad6',
    '#e8824a',
    '#333',
    '#d63a2f',
  ];
  return (
    <>
      <rect
        x={x - 30}
        y={y - 18}
        width={60}
        height={40}
        fill="#2a1e0e"
        rx={1}
      />
      <rect
        x={x - 28}
        y={y - 16}
        width={56}
        height={36}
        fill="#3a2a14"
        rx={1}
      />
      {colors.map((c, i) => (
        <rect
          key={i}
          x={x - 26 + i * 7}
          y={y - 14}
          width={5}
          height={32}
          fill={c}
          rx={0}
        />
      ))}
      <rect
        x={x - 28}
        y={y - 16}
        width={56}
        height={4}
        fill="#4a3820"
        opacity={0.6}
      />
    </>
  );
}

function TvSVG({ x, y }: { x: number; y: number }) {
  return (
    <>
      <rect
        x={x - 80}
        y={y + 6}
        width={160}
        height={30}
        fill="#0d1a2e"
        opacity={0.35}
        rx={0}
      />
      <rect x={x - 4} y={y - 2} width={8} height={8} fill="#333" />
      <rect x={x - 80} y={y - 12} width={160} height={20} fill="#111" />
      <rect x={x - 78} y={y - 10} width={156} height={16} fill="#0a0a0a" />
      <rect x={x - 74} y={y - 8} width={148} height={12} fill="#0d1a2e" />
      <rect
        x={x - 60}
        y={y - 7}
        width={120}
        height={10}
        fill="#102040"
        opacity={0.8}
      />
      {/* Play icon (rect approximation) */}
      <rect x={x - 8} y={y - 5} width={4} height={8} fill="#e8c84a" opacity={0.6} />
      <rect x={x - 4} y={y - 3} width={8} height={4} fill="#e8c84a" opacity={0.6} />
      <rect x={x + 4} y={y - 1} width={4} height={2} fill="#e8c84a" opacity={0.6} />
    </>
  );
}

function CoffeeTableSVG({ x, y }: { x: number; y: number }) {
  return (
    <>
      <rect
        x={x - 72}
        y={y - 22}
        width={144}
        height={56}
        fill="#00000030"
        rx={2}
      />
      <rect
        x={x - 76}
        y={y - 26}
        width={144}
        height={56}
        fill="#3d2e1a"
        rx={2}
      />
      <rect
        x={x - 72}
        y={y - 22}
        width={136}
        height={48}
        fill="#4a3820"
        rx={1}
      />
      <rect
        x={x - 70}
        y={y - 20}
        width={136}
        height={6}
        fill="#5a4830"
        opacity={0.5}
      />
      <rect x={x - 72} y={y + 24} width={10} height={6} fill="#2a1e0e" />
      <rect x={x + 62} y={y + 24} width={10} height={6} fill="#2a1e0e" />
      {/* Remote */}
      <rect x={x + 20} y={y - 12} width={32} height={14} fill="#1a1a1a" rx={2} />
      <rect x={x + 24} y={y - 9} width={10} height={4} fill="#333" rx={1} />
      <rect x={x + 38} y={y - 9} width={4} height={4} fill="#e8c84a" rx={1} opacity={0.7} />
      {/* Book */}
      <rect x={x - 60} y={y - 16} width={40} height={30} fill="#8b0000" rx={1} />
      <rect x={x - 56} y={y - 12} width={32} height={22} fill="#a01010" rx={1} />
      <rect x={x - 60} y={y - 16} width={5} height={30} fill="#600000" />
      {/* Cup */}
      <rect x={x - 8} y={y - 6} width={14} height={14} fill="#c8a060" rx={3} />
      <rect x={x - 6} y={y - 4} width={10} height={10} fill="#3a2010" rx={2} />
    </>
  );
}

interface Props {
  decoration: Decoration;
}

function DecorationSVG({ decoration }: Props) {
  const { type, x, y, rotation = 0 } = decoration;
  const content = (() => {
    switch (type) {
      case 'plant':
        return <PlantSVG x={x} y={y} />;
      case 'lamp':
        return <LampSVG x={x} y={y} />;
      case 'table':
        return <SideTableSVG x={x} y={y} />;
      case 'bookshelf':
        return <BookshelfSVG x={x} y={y} />;
      case 'tv':
        return <TvSVG x={x} y={y} />;
      case 'coffee-table':
        return <CoffeeTableSVG x={x} y={y} />;
      default:
        return null;
    }
  })();
  if (rotation === 0) return <>{content}</>;
  return (
    <g transform={`rotate(${rotation}, ${x}, ${y})`}>
      {content}
    </g>
  );
}

export default React.memo(DecorationSVG);
