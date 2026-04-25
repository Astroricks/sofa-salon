import Image from 'next/image';

/** User-provided assets in `public/screening-icons/`. */

const markSizePx = { sm: 20, md: 24 } as const;

export function DoubanMark({
  className,
  size = 'md',
}: {
  className?: string;
  /** `sm` for compact rows (e.g. home screening cards). */
  size?: 'sm' | 'md';
}) {
  const px = markSizePx[size];
  const box = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';
  return (
    <Image
      src="/screening-icons/douban.png"
      alt=""
      width={px}
      height={px}
      className={`${box} shrink-0 object-contain ${className ?? ''}`}
      aria-hidden
    />
  );
}

/** Circular crop hides square-canvas white corners on the PNG. */
export function LetterboxdMark({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md';
}) {
  const px = size === 'sm' ? 40 : 48;
  return (
    <Image
      src="/screening-icons/letterboxd.png"
      alt=""
      width={px}
      height={px}
      className={`h-full w-full object-cover object-center ${className ?? ''}`}
      aria-hidden
    />
  );
}

/** Compact YouTube-style mark (trailer link); inline SVG, no asset file. */
export function TrailerYoutubeMark({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 20 : 24;
  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      className={`shrink-0 ${className ?? ''}`}
      aria-hidden
    >
      <rect x="1" y="3" width="22" height="18" rx="4" fill="#FF0000" />
      <path d="M10 8.5v7l6-3.5-6-3.5z" fill="#fff" />
    </svg>
  );
}
