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
