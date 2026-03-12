'use client';

import React from 'react';
import type { AvatarConfig } from '@/lib/avatar';

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

const HAIR_RECTS: Record<number, [number, number, number, number][]> = {
  1: [
    [12, 6, 20, 7],
    [10, 9, 4, 8],
    [30, 9, 4, 8],
  ],
  2: [
    [12, 6, 20, 6],
    [8, 8, 5, 22],
    [31, 8, 5, 22],
  ],
  3: [
    [14, 8, 16, 5],
    [17, 1, 10, 10],
    [10, 10, 4, 6],
    [30, 10, 4, 6],
  ],
  4: [
    [10, 4, 24, 12],
    [8, 7, 6, 14],
    [30, 7, 6, 14],
  ],
  5: [
    [12, 4, 20, 10],
    [10, 8, 4, 12],
    [28, 8, 6, 12],
  ],
  6: [
    [14, 6, 16, 8],
    [10, 8, 6, 14],
    [28, 8, 6, 14],
  ],
};

const EYES: Record<string, JSX.Element> = {
  happy: (
    <>
      <rect x="17" y="15" width="3" height="3" fill="#111" />
      <rect x="24" y="15" width="3" height="3" fill="#111" />
      <rect x="18" y="21" width="8" height="2" fill="#c44" />
    </>
  ),
  sleepy: (
    <>
      <rect x="17" y="16" width="3" height="2" fill="#111" />
      <rect x="24" y="16" width="3" height="2" fill="#111" />
      <rect x="19" y="21" width="6" height="1" fill="#888" />
    </>
  ),
  excited: (
    <>
      <rect x="16" y="14" width="4" height="4" fill="#111" />
      <rect x="24" y="14" width="4" height="4" fill="#111" />
      <rect x="17" y="22" width="10" height="2" fill="#c44" />
    </>
  ),
  neutral: (
    <>
      <rect x="17" y="15" width="3" height="3" fill="#111" />
      <rect x="24" y="15" width="3" height="3" fill="#111" />
      <rect x="18" y="21" width="8" height="1" fill="#888" />
    </>
  ),
};

interface Props {
  config: AvatarConfig;
  size?: number;
  pose?: 'stand' | 'sit';
  className?: string;
}

function AvatarSVG({
  config,
  size = 44,
  pose = 'stand',
  className = '',
}: Props) {
  const {
    skinTone,
    hairStyle,
    hairColor,
    topColor,
    eyeExpression,
    accessory,
  } = config;
  const hairRects = HAIR_RECTS[hairStyle] ?? HAIR_RECTS[1];
  const eyes = EYES[eyeExpression] ?? EYES.neutral;
  const topDark = darken(topColor, 25);

  if (pose === 'sit') {
    return (
      <svg
        viewBox="0 0 44 60"
        width={size}
        height={Math.round((size * 60) / 44)}
        className={`pixel ${className}`}
        style={{ display: 'block' }}
      >
        {/* legs sitting */}
        <rect x="10" y="38" width="10" height="8" fill={topDark} />
        <rect x="24" y="38" width="10" height="8" fill={topDark} />
        {/* torso */}
        <rect x="14" y="28" width="16" height="14" fill={topColor} />
        <rect x="8" y="30" width="6" height="10" fill={topColor} />
        <rect x="30" y="30" width="6" height="10" fill={topColor} />
        {/* head */}
        <rect x="14" y="10" width="16" height="16" fill={skinTone} />
        {/* hair */}
        {hairRects.map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} fill={hairColor} />
        ))}
        {eyes}
        {accessory === 'hat' && (
          <rect x="20" y="4" width="4" height="4" fill={topColor} />
        )}
        {accessory === 'glasses' && (
          <>
            <rect x="15" y="14" width="8" height="4" fill="none" stroke="#333" strokeWidth="1" />
            <rect x="23" y="14" width="8" height="4" fill="none" stroke="#333" strokeWidth="1" />
          </>
        )}
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 44 60"
      width={size}
      height={Math.round((size * 60) / 44)}
      className={`pixel ${className}`}
      style={{ display: 'block' }}
    >
      {/* feet */}
      <rect x="13" y="56" width="7" height="4" fill="#222" />
      <rect x="24" y="56" width="7" height="4" fill="#222" />
      {/* legs */}
      <rect x="13" y="46" width="7" height="12" fill="#555" />
      <rect x="24" y="46" width="7" height="12" fill="#555" />
      {/* arms */}
      <rect x="6" y="30" width="6" height="12" fill={topColor} />
      <rect x="32" y="30" width="6" height="12" fill={topColor} />
      {/* torso */}
      <rect x="12" y="28" width="20" height="18" fill={topColor} />
      <rect x="10" y="28" width="5" height="5" fill={topColor} />
      <rect x="29" y="28" width="5" height="5" fill={topColor} />
      {/* neck */}
      <rect x="19" y="25" width="6" height="5" fill={skinTone} />
      {/* head */}
      <rect x="12" y="9" width="20" height="18" fill={skinTone} />
      {/* hair */}
      {hairRects.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={hairColor} />
      ))}
      {eyes}
      {accessory === 'hat' && (
        <rect x="18" y="2" width="8" height="6" fill={topColor} />
      )}
      {accessory === 'glasses' && (
        <>
          <rect x="15" y="14" width="8" height="4" fill="none" stroke="#333" strokeWidth="1" />
          <rect x="23" y="14" width="8" height="4" fill="none" stroke="#333" strokeWidth="1" />
        </>
      )}
    </svg>
  );
}

export default React.memo(AvatarSVG);
