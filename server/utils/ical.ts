// Minimal iCalendar (RFC 5545) writer for subscribable favorites calendars.

export interface CalendarEvent {
  uid: string;
  start: string;
  end: string | null;
  title: string;
  location: string | null;
  description: string | null;
  url: string;
  categories: string;
}

const DEFAULT_DURATION_MS = 60 * 60 * 1000;
const encoder = new TextEncoder();

/** ISO instant to `20261022T082000Z`. */
function utc(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d+/, "");
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Lines are at most 75 bytes; longer ones continue on lines starting with a space. */
function fold(line: string): string {
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/** Sanitized HTML from the Kikk CMS to plain text. */
export function htmlToText(html: string): string {
  return (
    html
      .replace(/<br\s*\/?>/gi, "\n")
      // Text can sit directly next to blocks, e.g. `text<div>more</div>`.
      .replace(/<\/?(p|div|li|ul|ol)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      // Any kind of space, including non-breaking ones.
      .replace(/&nbsp;|\p{Zs}/gu, " ")
      .replace(/[ \t]*\n[ \t]*/g, "\n")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&#x27;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

export function toICalendar(
  name: string,
  description: string,
  events: CalendarEvent[],
  stamp: string,
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KIKK 2026 Timetable//Favorites//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    `X-WR-CALDESC:${escapeText(description)}`,
    "X-WR-TIMEZONE:Europe/Brussels",
    // Hints for how often to check for changes. Not every calendar app follows them.
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const event of events) {
    const end = event.end ?? new Date(Date.parse(event.start) + DEFAULT_DURATION_MS).toISOString();
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${utc(stamp)}`,
      `DTSTART:${utc(event.start)}`,
      `DTEND:${utc(end)}`,
      `SUMMARY:${escapeText(event.title)}`,
      ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
      ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
      `URL:${event.url}`,
      `CATEGORIES:${escapeText(event.categories)}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
