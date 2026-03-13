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

function LampSVG({ x, y, color = '#c8a060' }: { x: number; y: number; color?: string }) {
  return (
    <>
      <rect x={x - 8} y={y + 2} width={16} height={4} fill="#3a3020" />
      <rect x={x - 3} y={y - 8} width={6} height={12} fill="#4a4030" />
      <rect x={x - 14} y={y - 14} width={28} height={8} fill={color} rx={4} />
      <rect
        x={x - 18}
        y={y + 4}
        width={36}
        height={20}
        fill={color}
        opacity={0.06}
        rx={4}
      />
    </>
  );
}

function SideTableSVG({ x, y, color = '#4a3820' }: { x: number; y: number; color?: string }) {
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
      <rect x={x - 22} y={y - 20} width={46} height={46} fill={color} rx={1} />
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

/** Flat rug/carpet on the floor. */
function RugSVG({ x, y, color = '#4a3820' }: { x: number; y: number; color?: string }) {
  const w = 80;
  const h = 50;
  return (
    <>
      <rect x={x - w / 2 - 2} y={y - h / 2 - 2} width={w + 4} height={h + 4} fill="#1a1510" rx={4} />
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill={color} rx={3} />
      <rect x={x - w / 2 + 4} y={y - h / 2 + 4} width={w - 8} height={h - 8} fill="#3a3028" opacity={0.6} rx={2} />
      <rect x={x - w / 2 + 8} y={y - h / 2 + 8} width={w - 16} height={h - 16} fill={color} opacity={0.9} rx={2} />
    </>
  );
}

function TvSVG({ x, y, color = '#0d1a2e' }: { x: number; y: number; color?: string }) {
  return (
    <>
      <rect
        x={x - 80}
        y={y + 6}
        width={160}
        height={30}
        fill={color}
        opacity={0.35}
        rx={0}
      />
      <rect x={x - 4} y={y - 2} width={8} height={8} fill="#333" />
      <rect x={x - 80} y={y - 12} width={160} height={20} fill="#111" />
      <rect x={x - 78} y={y - 10} width={156} height={16} fill="#0a0a0a" />
      <rect x={x - 74} y={y - 8} width={148} height={12} fill={color} />
      <rect
        x={x - 60}
        y={y - 7}
        width={120}
        height={10}
        fill={color}
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
  const { type, x, y, rotation = 0, color, scale = 1 } = decoration;
  const content = (() => {
    switch (type) {
      case 'plant':
        return <PlantSVG x={x} y={y} />;
      case 'lamp':
        return <LampSVG x={x} y={y} color={color} />;
      case 'table':
        return <SideTableSVG x={x} y={y} color={color} />;
      case 'rug':
        return <RugSVG x={x} y={y} color={decoration.color} />;
      case 'tv':
        return <TvSVG x={x} y={y} color={color} />;
      case 'coffee-table':
        return (
          <g transform={`translate(${x},${y}) scale(${scale}) translate(${-x},${-y})`}>
            <CoffeeTableSVG x={x} y={y} />
          </g>
        );
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
