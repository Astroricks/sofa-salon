import ScreeningExternalLinksRow from '@/components/ScreeningExternalLinksRow';
import { safeHttpUrl } from '@/lib/safe-http-url';

interface Props {
  description: string;
  doubanUrl?: string | null;
  letterboxdUrl?: string | null;
  trailerUrl?: string | null;
  labels: {
    filmNotes: string;
    linkDouban: string;
    linkLetterboxd: string;
    linkTrailer: string;
  };
}

export default function ScreeningFilmDetails({
  description,
  doubanUrl,
  letterboxdUrl,
  trailerUrl,
  labels,
}: Props) {
  const hasDesc = description.trim().length > 0;
  const hasLinks = Boolean(
    safeHttpUrl(doubanUrl) || safeHttpUrl(letterboxdUrl) || safeHttpUrl(trailerUrl)
  );
  if (!hasDesc && !hasLinks) return null;

  return (
    <section data-testid="screening-film-details" className="mb-6">
      {hasDesc && (
        <>
          <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            {labels.filmNotes}
          </h2>
          <p className="font-mono text-[13px] leading-relaxed text-[#c8c4bc] whitespace-pre-wrap">
            {description}
          </p>
        </>
      )}
      {hasLinks && (
        <ScreeningExternalLinksRow
          doubanUrl={doubanUrl}
          letterboxdUrl={letterboxdUrl}
          trailerUrl={trailerUrl}
          labels={{
            linkDouban: labels.linkDouban,
            linkLetterboxd: labels.linkLetterboxd,
            linkTrailer: labels.linkTrailer,
          }}
          className={hasDesc ? 'mt-4' : ''}
        />
      )}
    </section>
  );
}
