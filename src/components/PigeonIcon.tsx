'use client';

import Image from 'next/image';

/**
 * Pigeon icon (鸽子) — uses the gezi_1.svg design.
 * Used for: seat avatars when user is pigeon, profile badge, blood bar, NavBar, FAQ chatbot.
 */
const GEZI_ASPECT = 1058 / 1180; // height/width from gezi_1.svg viewBox

export default function PigeonIcon({
  size = 24,
  className,
  title = 'Pigeon',
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  const h = Math.round(size * GEZI_ASPECT);
  return (
    <Image
      src="/gezi_1.svg"
      alt={title}
      width={size}
      height={h}
      className={className}
      aria-hidden
      unoptimized
    />
  );
}
