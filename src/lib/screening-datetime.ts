/**
 * Venue IANA timezone for every screening time shown or edited by the app.
 * NEXT_PUBLIC_ is intentional: browser-rendered pages and server emails must use the same zone.
 */
const DEFAULT_VENUE_TIMEZONE = 'America/New_York';
const configuredVenueTimezone =
  process.env.NEXT_PUBLIC_VENUE_TIMEZONE?.trim() ||
  process.env.VENUE_TIMEZONE?.trim() ||
  DEFAULT_VENUE_TIMEZONE;

function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export const VENUE_TIMEZONE = isValidTimezone(configuredVenueTimezone)
  ? configuredVenueTimezone
  : DEFAULT_VENUE_TIMEZONE;

export type VenueDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function getVenueDateTimeParts(value: string | Date): VenueDateTimeParts | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-US-u-ca-gregory', {
    timeZone: VENUE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const numberPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: numberPart('year'),
    month: numberPart('month'),
    day: numberPart('day'),
    hour: numberPart('hour'),
    minute: numberPart('minute'),
    second: numberPart('second'),
  };
}

export function formatScreeningInVenue(
  screeningAtIso: string,
  locale: string,
  options: Intl.DateTimeFormatOptions
): string {
  const date = new Date(screeningAtIso);
  if (Number.isNaN(date.getTime())) return screeningAtIso;
  return date.toLocaleString(locale, { ...options, timeZone: VENUE_TIMEZONE });
}

/** Convert a stored UTC instant into the value expected by a datetime-local input. */
export function toVenueDatetimeLocal(screeningAtIso: string): string {
  const parts = getVenueDateTimeParts(screeningAtIso);
  if (!parts) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** Interpret a datetime-local wall time in the configured venue timezone and return UTC ISO. */
export function venueDatetimeLocalToIso(value: string): string {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (!match) throw new Error('Invalid local screening date and time');

  const desired = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? 0),
  };
  const desiredAsUtc = Date.UTC(
    desired.year,
    desired.month - 1,
    desired.day,
    desired.hour,
    desired.minute,
    desired.second
  );
  let instant = desiredAsUtc;

  // Iteratively apply the zone offset at the target instant. Two passes normally suffice;
  // four also handles dates close to daylight-saving transitions.
  for (let i = 0; i < 4; i += 1) {
    const observed = getVenueDateTimeParts(new Date(instant));
    if (!observed) break;
    const observedAsUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second
    );
    const adjustment = desiredAsUtc - observedAsUtc;
    instant += adjustment;
    if (adjustment === 0) break;
  }

  return new Date(instant).toISOString();
}

/** True when `screening_at` is before now (matches profile/admin “past” lists). */
export function isScreeningPast(screeningAtIso: string): boolean {
  const ts = new Date(screeningAtIso).getTime();
  return Number.isFinite(ts) && ts < Date.now();
}

/** Format screening_at for email bodies in the venue's local time. */
export function formatScreeningAtForEmail(screeningAtIso: string): string {
  return formatScreeningInVenue(screeningAtIso, 'en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
