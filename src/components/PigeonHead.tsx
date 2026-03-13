'use client';

import Image from 'next/image';

/**
 * Pigeon avatar for FAQ chatbot — uses gezi_2 (pigeon + shadow) or split layers.
 * Other pigeon uses (seats, profile, NavBar) still use PigeonIcon / gezi_1.svg.
 */
const GEZI2_ASPECT = 832 / 812; // height/width from gezi_2.svg viewBox 0 0 812 832

const SRC = {
  full: '/gezi_2.svg',
  shadow: '/gezi_2_shadow.svg',
  pigeon: '/gezi_2_pigeon.svg',
} as const;

export default function PigeonHead({
  size = 40,
  className,
  title = 'Pigeon',
  layer = 'full',
}: {
  size?: number;
  className?: string;
  title?: string;
  /** 'full' = combined image (default). 'shadow' / 'pigeon' = split layers for bounce (shadow stays still). */
  layer?: 'full' | 'shadow' | 'pigeon';
}) {
  const h = Math.round(size * GEZI2_ASPECT);
  return (
    <Image
      src={SRC[layer]}
      alt={title}
      width={size}
      height={h}
      className={className}
      aria-hidden
      unoptimized
    />
  );
}
