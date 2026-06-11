/**
 * App display name and tagline. All app-name references must import from here; never hardcode elsewhere.
 */
// ALL app-name references must import from here. Never write the app name as a literal.

/** Display name (e.g. "Sofa Salon" or "ZiggyGraph"). From env or default. */
export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME ?? 'Sofa Salon';

/** Short tagline shown in UI (e.g. "Your host's living room"). */
export const APP_TAGLINE =
  process.env.NEXT_PUBLIC_APP_TAGLINE ?? "Your host's living room";

/** APP_NAME split by space; used for styling or header (e.g. first word in one colour). */
export const APP_NAME_PARTS = APP_NAME.split(' ');

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
  process.env.NEXT_PUBLIC_PAST_SCREENINGS_URL_EN?.trim() ||
  'https://letterboxd.com/ziggyzaggy/list/ziggygraph-screened/';
export const PAST_SCREENINGS_URL_ZH =
  process.env.NEXT_PUBLIC_PAST_SCREENINGS_URL_ZH?.trim() ||
  'https://docs.google.com/spreadsheets/d/1lrEE5G72IrhtxurPoYcLOJP2YKwGXGduKA44nYsjQ-M/';

/** Public attribution shown in navigation. */
export const DEVELOPER_NAME =
  process.env.NEXT_PUBLIC_DEVELOPER_NAME?.trim() || 'Eve';
export const DEVELOPER_URL =
  process.env.NEXT_PUBLIC_DEVELOPER_URL?.trim() || 'https://eveshi.com/';

/** Host and venue identity used by exported receipts. */
export const HOST_NAME = process.env.NEXT_PUBLIC_HOST_NAME?.trim() || 'Ziggy';
export const VENUE_ADDRESS = process.env.NEXT_PUBLIC_VENUE_ADDRESS?.trim() ?? '';
export const RECEIPT_SUBTITLE =
  process.env.NEXT_PUBLIC_RECEIPT_SUBTITLE?.trim() || 'SCREENING ROOM';

/**
 * Salon host on the leaderboard: rank #0 in standing, hidden from the public table.
 * Co-admins (`is_admin` without a matching name here) compete like any guest.
 * Comma-separated, case-insensitive display names. Default: Ziggy
 */
export const LEADERBOARD_HOST_DISPLAY_NAMES: readonly string[] = (
  process.env.LEADERBOARD_HOST_DISPLAY_NAMES ?? 'Ziggy'
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
