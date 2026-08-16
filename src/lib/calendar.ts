// Add-to-calendar helpers. Salvaged/generalized from the original Tagor.

interface CalendarEvent {
  title: string;
  startISO: string;
  endISO?: string;
  details?: string;
  location?: string;
}

function toGCalStamp(iso: string): string {
  // Google Calendar wants YYYYMMDDTHHMMSSZ (UTC).
  return new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/** Builds a Google Calendar "add event" URL. Defaults to a 2h duration if no end. */
export function buildGoogleCalendarUrl(e: CalendarEvent): string {
  const start = new Date(e.startISO);
  const end = e.endISO ? new Date(e.endISO) : new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${toGCalStamp(start.toISOString())}/${toGCalStamp(end.toISOString())}`,
  });
  if (e.details) params.set('details', e.details);
  if (e.location) params.set('location', e.location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
