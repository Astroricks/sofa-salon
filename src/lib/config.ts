/**
 * App display name and tagline. All app-name references must import from here; never hardcode elsewhere.
 */
// ALL app-name references must import from here. Never write the app name as a literal.

/** Display name (e.g. "Sofa Salon" or "Film Club"). From env or default. */
export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME ?? 'Sofa Salon';

/** Short tagline shown in UI (e.g. "Your host's living room"). */
export const APP_TAGLINE =
  process.env.NEXT_PUBLIC_APP_TAGLINE ?? "Your host's living room";

/** APP_NAME split by space; used for styling or header (e.g. first word in one colour). */
export const APP_NAME_PARTS = APP_NAME.split(' ');

/** Community/salon name used in descriptive copy. Defaults to the app display name. */
export const SALON_NAME =
  process.env.NEXT_PUBLIC_SALON_NAME?.trim() || APP_NAME;

/**
 * Public site URL for links shared with guests (WeChat announcements, email profile links).
 * Not used for auth callback redirects (those follow the request host / NEXT_PUBLIC_APP_URL).
 * Production deployments should set NEXT_PUBLIC_CUSTOMER_SITE_URL explicitly.
 */
export const CUSTOMER_SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_CUSTOMER_SITE_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  'http://localhost:3000'
).replace(/\/$/, '');

/** Locale-specific archive links shown in the main navigation. */
export const PAST_SCREENINGS_URL_EN =
  process.env.NEXT_PUBLIC_PAST_SCREENINGS_URL_EN?.trim() ?? '';
export const PAST_SCREENINGS_URL_ZH =
  process.env.NEXT_PUBLIC_PAST_SCREENINGS_URL_ZH?.trim() ?? '';

export type DeveloperAttribution = {
  name: string;
  url: string;
};

function parseDevelopers(value: string | undefined): DeveloperAttribution[] {
  if (!value?.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];

      const { name, url } = entry as { name?: unknown; url?: unknown };
      const normalizedName = typeof name === 'string' ? name.trim() : '';
      const normalizedUrl = typeof url === 'string' ? url.trim() : '';
      if (!normalizedName) return [];

      return [{ name: normalizedName, url: normalizedUrl }];
    });
  } catch {
    return [];
  }
}

/** Legacy single-developer attribution. Prefer NEXT_PUBLIC_DEVELOPERS for new deployments. */
export const DEVELOPER_NAME =
  process.env.NEXT_PUBLIC_DEVELOPER_NAME?.trim() ?? '';
export const DEVELOPER_URL =
  process.env.NEXT_PUBLIC_DEVELOPER_URL?.trim() ?? '';

/** Public developer attribution shown in navigation. */
const configuredDevelopers = parseDevelopers(process.env.NEXT_PUBLIC_DEVELOPERS);
export const DEVELOPERS: readonly DeveloperAttribution[] =
  configuredDevelopers.length > 0
    ? configuredDevelopers
    : DEVELOPER_NAME
      ? [{ name: DEVELOPER_NAME, url: DEVELOPER_URL }]
      : [];

/** Host and venue identity used by help text and exported receipts. */
export const HOST_NAME = process.env.NEXT_PUBLIC_HOST_NAME?.trim() ?? '';
export const VENUE_ADDRESS = process.env.NEXT_PUBLIC_VENUE_ADDRESS?.trim() ?? '';
export const RECEIPT_SUBTITLE =
  process.env.NEXT_PUBLIC_RECEIPT_SUBTITLE?.trim() || 'SCREENING ROOM';

/**
 * Salon host on the leaderboard: rank #0 in standing, hidden from the public table.
 * Co-admins (`is_admin` without a matching name here) compete like any guest.
 * Comma-separated, case-insensitive display names. Empty by default.
 */
export const LEADERBOARD_HOST_DISPLAY_NAMES: readonly string[] = (
  process.env.LEADERBOARD_HOST_DISPLAY_NAMES ?? ''
)
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isLeaderboardHostDisplayName(displayName: string | null | undefined): boolean {
  const normalized = (displayName ?? '').trim().toLowerCase();
  return normalized.length > 0 && LEADERBOARD_HOST_DISPLAY_NAMES.includes(normalized);
}

/** Inbox for “message the host” form (server only). Set HOST_CONTACT_EMAIL in env. */
export const HOST_CONTACT_EMAIL = process.env.HOST_CONTACT_EMAIL?.trim() ?? '';
