import { APP_NAME, CUSTOMER_SITE_ORIGIN } from '@/lib/config';

/** Default block length when `duration_minutes` is missing (typical film + buffer). */
export const DEFAULT_SCREENING_DURATION_MIN = 120;

/** Google Calendar “create event” template (user must click Save in Google). */
export function formatGoogleCalendarUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function screeningEndUtc(
  start: Date,
  durationMinutes: number | null | undefined
): Date {
  const mins =
    typeof durationMinutes === 'number' &&
    Number.isFinite(durationMinutes) &&
    durationMinutes > 0
      ? Math.min(durationMinutes, 24 * 60)
      : DEFAULT_SCREENING_DURATION_MIN;
  return new Date(start.getTime() + mins * 60 * 1000);
}

export function buildGoogleCalendarTemplateUrl(params: {
  title: string;
  start: Date;
  end: Date;
  details?: string;
  location?: string;
}): string {
  const dates = `${formatGoogleCalendarUtc(params.start)}/${formatGoogleCalendarUtc(params.end)}`;
  const q: string[] = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(params.title)}`,
    `dates=${dates}`,
  ];
  if (params.details) q.push(`details=${encodeURIComponent(params.details)}`);
  if (params.location) q.push(`location=${encodeURIComponent(params.location)}`);
  return `https://calendar.google.com/calendar/render?${q.join('&')}`;
}

/** Escape text for iCalendar TEXT fields (RFC 5545). */
export function escapeIcsText(raw: string): string {
  return raw
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .slice(0, 5000);
}

function icsHost(): string {
  try {
    return new URL(CUSTOMER_SITE_ORIGIN).hostname || 'event';
  } catch {
    return 'event';
  }
}

/** Single VEVENT .ics body (CRLF). Suitable as email attachment. */
export function buildScreeningIcs(params: {
  uid: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  url?: string;
  location?: string;
}): string {
  const dtStamp = formatGoogleCalendarUtc(new Date());
  const dtStart = formatGoogleCalendarUtc(params.start);
  const dtEnd = formatGoogleCalendarUtc(params.end);
  const desc = escapeIcsText(
    [params.description, params.url ? `\n${params.url}` : ''].join('')
  );
  const summary = escapeIcsText(params.title.slice(0, 500));
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${APP_NAME.replace(/[^a-zA-Z0-9]/g, '')}//Screening//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${params.uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${desc}`,
    ...(params.location ? [`LOCATION:${escapeIcsText(params.location.slice(0, 500))}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

export function screeningCalendarUid(screeningId: string): string {
  return `${screeningId}@${icsHost()}`;
}
