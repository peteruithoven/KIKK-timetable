export type TimetableEvent = Pick<
  FestivalEvent,
  "id" | "kind" | "slug" | "title" | "date" | "start" | "end" | "startsAt" | "venue" | "image"
> & {
  /** Speaker names for the card, null when there are none or they're the title. */
  speakers: string | null;
};

export function speakerLine(event: FestivalEvent): string | null {
  const names = event.speakers.map((speaker) => speaker.name).join(", ");
  if (!names || names.toLowerCase() === event.title.trim().toLowerCase()) return null;
  return names;
}

export interface PlacedEvent {
  event: TimetableEvent;
  /** Minutes from the start of the timetable. */
  top: number;
  duration: number;
  lane: number;
  lanes: number;
}

export interface VenueColumn {
  name: string;
  events: PlacedEvent[];
}

export interface DayTimetable {
  /** Minutes after midnight where the timetable starts, on the hour. */
  startMinute: number;
  /** Length in minutes, ending on the hour. */
  length: number;
  /** Instant (ms) the timetable starts, to place the current time. */
  startsAt: number | null;
  venues: VenueColumn[];
}

/** Used for events without an end time. */
const DEFAULT_DURATION = 60;
const UNKNOWN_VENUE = "To be announced";

const VENUE_ORDER = [
  "Théâtre de Namur — Grande Salle",
  "Théâtre de Namur — Le Studio",
  "La Bourse — Auditoire Rops",
  "La Bourse — Auditoire Michaux",
  "La Bourse — Plein Ciel",
  "Le Delta",
];

/** `"La Bourse — Auditoire Rops"` → building `"La Bourse"`, room `"Auditoire Rops"`. */
export function venueParts(venue: string): { building: string | null; room: string } {
  const [building, room] = venue.split(" — ");
  return room ? { building: building!, room } : { building: null, room: venue };
}

function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours! * 60 + minutes!;
}

function venueRank(name: string): number {
  const index = VENUE_ORDER.indexOf(name);
  return index === -1 ? VENUE_ORDER.length : index;
}

/** Puts overlapping events side by side in lanes. */
function assignLanes(events: PlacedEvent[]): void {
  events.sort((a, b) => a.top - b.top || b.duration - a.duration);
  let cluster: PlacedEvent[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;
  const closeCluster = () => {
    for (const placed of cluster) placed.lanes = laneEnds.length;
    cluster = [];
    laneEnds = [];
  };
  for (const placed of events) {
    if (placed.top >= clusterEnd) closeCluster();
    let lane = laneEnds.findIndex((end) => end <= placed.top);
    if (lane === -1) lane = laneEnds.push(0) - 1;
    laneEnds[lane] = placed.top + placed.duration;
    placed.lane = lane;
    cluster.push(placed);
    clusterEnd = Math.max(clusterEnd, placed.top + placed.duration);
  }
  closeCluster();
}

export function buildDayTimetable(events: TimetableEvent[]): DayTimetable {
  const timed = events.flatMap((event) => {
    if (!event.start) return [];
    const start = toMinutes(event.start);
    let end = event.end ? toMinutes(event.end) : start + DEFAULT_DURATION;
    // Runs past midnight.
    if (end <= start) end += 24 * 60;
    return [{ event, start, end }];
  });
  if (timed.length === 0) return { startMinute: 0, length: 0, startsAt: null, venues: [] };

  const startMinute = Math.floor(Math.min(...timed.map((t) => t.start)) / 60) * 60;
  const endMinute = Math.ceil(Math.max(...timed.map((t) => t.end)) / 60) * 60;

  const byVenue = new Map<string, PlacedEvent[]>();
  for (const { event, start, end } of timed) {
    const name = event.venue ?? UNKNOWN_VENUE;
    const placed = { event, top: start - startMinute, duration: end - start, lane: 0, lanes: 1 };
    byVenue.set(name, [...(byVenue.get(name) ?? []), placed]);
  }
  const venues = [...byVenue]
    .map(([name, placed]) => {
      assignLanes(placed);
      return { name, events: placed };
    })
    .sort((a, b) => venueRank(a.name) - venueRank(b.name) || a.name.localeCompare(b.name));

  const anchor = timed.find((t) => t.event.startsAt);
  const startsAt = anchor
    ? Date.parse(anchor.event.startsAt!) - (anchor.start - startMinute) * 60_000
    : null;

  return { startMinute, length: endMinute - startMinute, startsAt, venues };
}

/** `"2026-10-22"` → `"Thu 22 Oct"`. */
export function formatDay(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

/** Today's date at the festival, `YYYY-MM-DD`. */
export function festivalToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());
}

/**
 * Asks Supabase for a resized copy of storage images. With a height, it's cropped to fill that
 * box. Without, it's scaled to the width: Supabase's `cover` would keep the original height and
 * crop the width instead. Images smaller than asked aren't enlarged.
 */
export function resizedImage(url: string, width: number, height?: number): string {
  const original = "/storage/v1/object/public/";
  if (!url.includes(original)) return url;
  const resized = url.replace(original, "/storage/v1/render/image/public/");
  const size = height
    ? `width=${width}&height=${height}&resize=cover`
    : `width=${width}&resize=contain`;
  return `${resized}?${size}&quality=75`;
}

/**
 * Link preview image meta for `useSeoMeta`, for an event or artwork image. Without an image,
 * app.vue's default card stays. Its size is cleared (null), the resized image's height is unknown.
 */
export function ogImageMeta(image: () => string | null | undefined) {
  const width = 1200;
  return {
    ogImage: () => {
      const url = image();
      return url ? resizedImage(url, width) : undefined;
    },
    ogImageWidth: () => (image() ? width : undefined),
    ogImageHeight: () => (image() ? null : undefined),
  };
}
