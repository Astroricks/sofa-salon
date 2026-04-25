import { safeHttpUrl } from '@/lib/safe-http-url';

import { DoubanMark, LetterboxdMark, TrailerYoutubeMark } from '@/components/ScreeningLinkIcons';

interface Labels {
  linkDouban: string;
  linkLetterboxd: string;
  linkTrailer: string;
}

interface Props {
  doubanUrl?: string | null;
  letterboxdUrl?: string | null;
  trailerUrl?: string | null;
  labels: Labels;
  className?: string;
}

/** No stroked “chip” frame — only a soft hover wash for affordance. */
const chipBase =
  'group inline-flex items-center gap-2.5 rounded-sm px-2.5 py-2 ' +
  'font-mono text-[11px] tracking-[0.06em] text-[#a5a19a] transition-all duration-200 ' +
  'hover:bg-white/[0.06] hover:text-[#e8e4dc] ' +
  'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#e8c84a]/60';

/** Shared Douban / Letterboxd / trailer link row (server or client). */
export default function ScreeningExternalLinksRow({
  doubanUrl,
  letterboxdUrl,
  trailerUrl,
  labels,
  className = '',
}: Props) {
  const doubanHref = safeHttpUrl(doubanUrl);
  const letterboxdHref = safeHttpUrl(letterboxdUrl);
  const trailerHref = safeHttpUrl(trailerUrl);
  if (!doubanHref && !letterboxdHref && !trailerHref) return null;

  return (
    <div
      className={`flex flex-wrap items-stretch gap-3 ${className}`}
      data-testid="screening-external-links"
    >
      {doubanHref && (
        <a
          href={doubanHref}
          target="_blank"
          rel="noopener noreferrer"
          className={chipBase}
          aria-label={labels.linkDouban}
        >
          <span className="shrink-0 overflow-hidden rounded-[6px] bg-inherit transition-opacity group-hover:opacity-95">
            <DoubanMark />
          </span>
          <span>{labels.linkDouban}</span>
        </a>
      )}
      {letterboxdHref && (
        <a
          href={letterboxdHref}
          target="_blank"
          rel="noopener noreferrer"
          className={chipBase}
          aria-label={labels.linkLetterboxd}
        >
          <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-inherit transition-opacity group-hover:opacity-95">
            <LetterboxdMark />
          </span>
          <span>{labels.linkLetterboxd}</span>
        </a>
      )}
      {trailerHref && (
        <a
          href={trailerHref}
          target="_blank"
          rel="noopener noreferrer"
          className={chipBase}
          aria-label={labels.linkTrailer}
        >
          <span className="shrink-0 transition-opacity group-hover:opacity-95">
            <TrailerYoutubeMark />
          </span>
          <span>{labels.linkTrailer}</span>
        </a>
      )}
    </div>
  );
}
