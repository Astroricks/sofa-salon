/**
 * Venue IANA timezone for server-rendered screening times (emails, cron).
 * Node defaults to UTC in production; without an explicit zone, toLocaleString() shows UTC wall time.
 */
export const VENUE_TIMEZONE =
  process.env.VENUE_TIMEZONE?.trim() || 'America/New_York';

/** True when `screening_at` is before now (matches profile/admin “past” lists). */
export function isScreeningPast(screeningAtIso: string): boolean {
  const ts = new Date(screeningAtIso).getTime();
  return Number.isFinite(ts) && ts < Date.now();
}

/** Format screening_at for email bodies in the venue's local time. */
export function formatScreeningAtForEmail(screeningAtIso: string): string {
  const d = new Date(screeningAtIso);
  if (Number.isNaN(d.getTime())) return screeningAtIso;
  return d.toLocaleString('en-US', {
    timeZone: VENUE_TIMEZONE,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
