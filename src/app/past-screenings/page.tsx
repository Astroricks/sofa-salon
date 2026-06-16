import { cookies } from 'next/headers';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { APP_NAME_PARTS } from '@/lib/config';
import { getT, localeFromValue } from '@/lib/i18n';
import { fetchScreeningAltLocaleByIds } from '@/lib/screening-alt-locale-fetch';
import {
  screeningDisplayDirector,
  screeningDisplayTitle,
} from '@/lib/screening-display';
import { formatScreeningInVenue } from '@/lib/screening-datetime';
import { safeHttpUrl } from '@/lib/safe-http-url';
import {
  normalizePastScreeningsSearch,
  PAST_SCREENINGS_PAGE_SIZE,
  pastScreeningsPageHref,
} from '@/lib/past-screenings';

export const dynamic = 'force-dynamic';

type PastScreeningRow = {
  id: string;
  title: string;
  description: string | null;
  screening_at: string;
  year: number | null;
  director: string | null;
  duration_minutes: number | null;
  douban_url: string | null;
  letterboxd_url: string | null;
  trailer_url: string | null;
};

export default async function PastScreeningsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = normalizePastScreeningsSearch(params.q);
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const cookieStore = await cookies();
  const locale = localeFromValue(cookieStore.get('sofa-salon-locale')?.value);
  const t = getT(locale);

  // The server-only admin client exposes inactive imported archive rows without
  // weakening browser credentials. Public RLS remains a fallback for simpler installs.
  const client = createAdminClient() ?? (await createClient());
  const now = new Date().toISOString();
  let screeningQuery = client
    .from('screenings')
    .select(
      'id, title, description, screening_at, year, director, duration_minutes, douban_url, letterboxd_url, trailer_url',
      { count: 'exact' }
    )
    .lt('screening_at', now)
    .order('screening_at', { ascending: false });

  if (query) {
    screeningQuery = screeningQuery.or(
      `title.ilike.%${query}%,director.ilike.%${query}%`
    );
  }

  const offset = (requestedPage - 1) * PAST_SCREENINGS_PAGE_SIZE;
  const { data, count, error } = await screeningQuery.range(
    offset,
    offset + PAST_SCREENINGS_PAGE_SIZE - 1
  );
  const rows = error ? [] : ((data ?? []) as PastScreeningRow[]);
  const total = error ? 0 : (count ?? rows.length);
  const totalPages = Math.max(1, Math.ceil(total / PAST_SCREENINGS_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const altLocaleById = await fetchScreeningAltLocaleByIds(
    client,
    rows.map((row) => row.id)
  );

  return (
    <main className="min-h-screen bg-[#0f0f0f] px-4 py-8 safe-area-inset-bottom">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-pixel text-xl text-[#e8e4dc] mb-1">
          {APP_NAME_PARTS[0]}
          <span className="text-[#e8c84a]">{APP_NAME_PARTS.slice(1).join('')}</span>
        </h1>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a]">
          {t.pastScreeningsPage.title}
        </p>
        <p className="font-mono text-[12px] text-[#888888] mt-3 mb-6">
          {t.pastScreeningsPage.intro}
        </p>

        <form action="/past-screenings" method="get" className="flex gap-2 mb-8">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={t.pastScreeningsPage.searchPlaceholder}
            className="min-w-0 flex-1 bg-[#161616] border border-[#2a2a2a] px-3 py-2.5 font-mono text-[13px] text-[#e8e4dc] outline-none focus:border-[#e8c84a]"
            style={{ borderRadius: 0 }}
          />
          <button
            type="submit"
            className="border border-[#e8c84a] px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] hover:bg-[#e8c84a]/10"
            style={{ borderRadius: 0 }}
          >
            {t.pastScreeningsPage.search}
          </button>
        </form>

        {rows.length === 0 ? (
          <p className="border border-[#2a2a2a] p-6 font-mono text-[13px] text-[#666]">
            {t.pastScreeningsPage.empty}
          </p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {rows.map((row) => {
              const alt = altLocaleById[row.id];
              const title = screeningDisplayTitle(locale, row.title, alt?.title_en);
              const director = screeningDisplayDirector(
                locale,
                row.director,
                alt?.director_en
              );
              const date = formatScreeningInVenue(
                row.screening_at,
                locale === 'zh' ? 'zh-CN' : 'en-GB',
                { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' }
              );
              const meta = [
                row.year,
                director || null,
                row.duration_minutes ? `${row.duration_minutes} min` : null,
              ].filter(Boolean);
              const linkCandidates = [
                { label: t.screening.linkDouban, href: safeHttpUrl(row.douban_url) },
                { label: t.screening.linkLetterboxd, href: safeHttpUrl(row.letterboxd_url) },
                { label: t.screening.linkTrailer, href: safeHttpUrl(row.trailer_url) },
              ];
              const links: Array<{ label: string; href: string }> = [];
              for (const candidate of linkCandidates) {
                if (candidate.href) links.push({ label: candidate.label, href: candidate.href });
              }

              return (
                <li
                  key={row.id}
                  className="border border-[#2a2a2a] bg-[#161616] p-5"
                  style={{ borderRadius: 0 }}
                >
                  <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-[#666]">
                    {date}
                  </p>
                  <h2 className="font-pixel-cjk text-lg text-[#e8e4dc] mt-2">{title}</h2>
                  {meta.length > 0 ? (
                    <p className="font-mono text-[11px] uppercase text-[#888888] mt-2">
                      {meta.join(' · ')}
                    </p>
                  ) : null}
                  {row.description?.trim() ? (
                    <p className="font-mono text-[12px] leading-relaxed text-[#777] mt-3 whitespace-pre-wrap">
                      {row.description.trim()}
                    </p>
                  ) : null}
                  {links.length > 0 ? (
                    <div className="flex flex-wrap gap-3 mt-4">
                      {links.map((item) => (
                        <a
                          key={item.label}
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[10px] tracking-[0.15em] uppercase text-[#e8c84a] hover:underline"
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {total > PAST_SCREENINGS_PAGE_SIZE ? (
          <nav className="flex items-center justify-between gap-4 mt-8">
            {page > 1 ? (
              <Link
                href={pastScreeningsPageHref(page - 1, query)}
                className="font-mono text-[10px] tracking-[0.15em] uppercase text-[#e8c84a]"
              >
                ← {t.pastScreeningsPage.previous}
              </Link>
            ) : (
              <span />
            )}
            <span className="font-mono text-[10px] text-[#666]">
              {t.pastScreeningsPage.pageStatus
                .replace('{page}', String(page))
                .replace('{pages}', String(totalPages))}
            </span>
            {page < totalPages ? (
              <Link
                href={pastScreeningsPageHref(page + 1, query)}
                className="font-mono text-[10px] tracking-[0.15em] uppercase text-[#e8c84a]"
              >
                {t.pastScreeningsPage.next} →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </div>
    </main>
  );
}
