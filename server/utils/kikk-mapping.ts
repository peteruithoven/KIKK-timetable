import sanitizeHtml from "sanitize-html";
import type { ByNightRow, ConferenceRow, KikkData, PanelPersonRow, PanelRow } from "./kikk-api";
import { KIKK_SITE_URL } from "./kikk-api";

const TIME_ZONE = "Europe/Brussels";

const TRACKS: Record<string, string> = {
  wake_room: "Wake!Room",
  kikk_live_industrie: "KIKK Live Industries",
  aquamotion_room: "S+T+ARTS Aquamotion Room",
  delegation_panel: "Delegation Panel",
};

const VENUE_ALIASES: Record<string, string> = {
  Delta: "Le Delta",
};

/** Trimmed string, or null when empty. */
function text(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function localized(fr: string | null | undefined, en: string | null | undefined): Localized | null {
  const result = { fr: text(fr), en: text(en) };
  return result.fr || result.en ? result : null;
}

const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "div", "br", "b", "strong", "i", "em", "u", "a", "ul", "ol", "li"],
  allowedAttributes: { a: ["href"] },
  allowedSchemes: ["http", "https", "mailto"],
  // Other tags (font, span) are dropped but their text is kept.
  disallowedTagsMode: "discard",
  // The editor wraps blank lines in their own blocks; spacing comes from CSS.
  exclusiveFilter: (frame) => ["p", "div"].includes(frame.tag) && !frame.text.trim(),
  transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener", target: "_blank" }) },
};

/** Plain text gets paragraphs; HTML from the CMS is reduced to basic formatting. */
function richHtml(value: string | null | undefined): string | null {
  const source = text(value);
  if (!source) return null;
  const html = /<[a-z][\s\S]*>/i.test(source)
    ? source
    : source
        .split(/\n\s*\n/)
        .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
        .join("");
  return text(sanitizeHtml(html, RICH_TEXT_OPTIONS));
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function richText(fr: string | null | undefined, en: string | null | undefined): Localized | null {
  return localized(richHtml(fr), richHtml(en));
}

function venue(...candidates: (string | null | undefined)[]): string | null {
  const name = candidates.map((c) => text(c)?.replace(/\s+/g, " ")).find(Boolean) ?? null;
  return name ? (VENUE_ALIASES[name] ?? name) : null;
}

/** `"10:20:00"` → `"10:20"`. */
function time(value: string | null): string | null {
  const match = value?.match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1]!.padStart(2, "0")}:${match[2]}` : null;
}

function offsetMinutes(instant: number): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, timeZoneName: "longOffset" })
    .formatToParts(instant)
    .find((part) => part.type === "timeZoneName")?.value;
  const match = name?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  return (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
}

/** Brussels wall-clock date and time to an ISO instant. */
function toInstant(date: string, hhmm: string, addDays = 0): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = hhmm.split(":").map(Number);
  const wallClock = Date.UTC(year!, month! - 1, day! + addDays, hours, minutes);
  return new Date(wallClock - offsetMinutes(wallClock) * 60_000).toISOString();
}

function timing(date: string, startTime: string | null, endTime: string | null) {
  const start = time(startTime);
  const end = time(endTime);
  return {
    date,
    start,
    end,
    startsAt: start ? toInstant(date, start) : null,
    // An end before the start means the event runs past midnight.
    endsAt: start && end ? toInstant(date, end, end < start ? 1 : 0) : null,
  };
}

function image(row: ConferenceRow | ByNightRow | PanelRow): string | null {
  return text(row.image_url) ?? text(row.gallery_images?.[0]) ?? text(row.hero_image_url);
}

function tags(row: { tags: string[] | null }): string[] {
  return (row.tags ?? []).map(text).filter((tag): tag is string => tag !== null);
}

function panelPerson(person: PanelPersonRow | null | undefined): Person | null {
  const name = text(person?.full_name);
  if (!person || !name) return null;
  return {
    name,
    company: text(person.company),
    role: localized(person.role, person.role_en),
    bio: richText(person.description, person.description_en),
    location: null,
    photo: text(person.photo_url),
  };
}

function fromConference(row: ConferenceRow): FestivalEvent | null {
  if (!row.date || !row.slug) return null;
  const speaker = text(row.speaker_name);
  return {
    id: `talk:${row.id}`,
    kind: "talk",
    slug: row.slug,
    url: `${KIKK_SITE_URL}/talks/${row.slug}`,
    title: text(row.title) ?? speaker ?? "",
    track: TRACKS[row.thematic_room ?? ""] ?? null,
    ...timing(row.date, row.start_time, row.end_time),
    venue: venue(row.room_name, row.location),
    speakers: speaker
      ? [
          {
            name: speaker,
            company: text(row.company_studio),
            role: null,
            bio: richText(row.speaker_bio, row.speaker_bio_en),
            location: localized(row.speaker_location_fr, row.speaker_location),
            photo: null,
          },
        ]
      : [],
    moderator: null,
    intro: richText(row.intro_text, row.intro_text_en),
    description: richText(row.description, row.description_en),
    image: image(row),
    tags: tags(row),
    language: text(row.language)?.toLowerCase() ?? null,
    websiteUrl: text(row.website_url),
    ticketUrl: null,
  };
}

function fromByNight(row: ByNightRow): FestivalEvent | null {
  if (!row.event_date || !row.slug) return null;
  return {
    id: `party:${row.id}`,
    kind: "party",
    slug: row.slug,
    url: `${KIKK_SITE_URL}/parties/${row.slug}`,
    // The title holds a "THU 22 OCT · 21:00 · …" summary; the line-up is in artist_name.
    title: text(row.artist_name) ?? text(row.title) ?? "",
    track: null,
    ...timing(row.event_date, row.start_time, row.end_time),
    venue: venue(row.room_name, row.venue),
    speakers: [],
    moderator: null,
    intro: richText(row.intro_text, row.intro_text_en),
    description: richText(row.description, row.description_en),
    image: image(row),
    tags: tags(row),
    language: null,
    websiteUrl: text(row.website_url),
    ticketUrl: text(row.ticket_url),
  };
}

function fromPanel(row: PanelRow): FestivalEvent | null {
  if (!row.event_date || !row.slug) return null;
  return {
    id: `panel:${row.id}`,
    kind: "panel",
    slug: row.slug,
    url: `${KIKK_SITE_URL}/panels/${row.slug}`,
    title: text(row.title) ?? "",
    track: TRACKS[row.room ?? ""] ?? null,
    ...timing(row.event_date, row.start_time, row.end_time),
    venue: venue(row.room_name, row.location),
    speakers: (row.speakers ?? []).map(panelPerson).filter((p): p is Person => p !== null),
    moderator: panelPerson(row.moderator),
    intro: richText(row.intro_text, row.intro_text_en),
    description: richText(row.description, row.description_en),
    image: image(row),
    tags: tags(row),
    language: text(row.language)?.toLowerCase() ?? null,
    websiteUrl: null,
    ticketUrl: null,
  };
}

export function toFestivalEvents(data: KikkData): FestivalEvent[] {
  return [
    ...data.conferences.map(fromConference),
    ...data.by_night_events.map(fromByNight),
    ...data.panels.map(fromPanel),
  ]
    .filter((event): event is FestivalEvent => event !== null)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.start ?? "").localeCompare(b.start ?? "") ||
        (a.venue ?? "").localeCompare(b.venue ?? ""),
    );
}
