export type EventKind = "talk" | "panel" | "party";

/** Text in both festival languages. Bios, intros and descriptions are sanitized HTML. */
export interface Localized {
  fr: string | null;
  en: string | null;
}

export interface Person {
  name: string;
  company: string | null;
  role: Localized | null;
  bio: Localized | null;
  location: Localized | null;
  photo: string | null;
}

export interface FestivalEvent {
  /** Unique across kinds, e.g. `talk:<uuid>`. */
  id: string;
  kind: EventKind;
  slug: string;
  /** Page on kikkfestival.be. */
  url: string;
  title: string;
  /** Thematic room or programme, e.g. "Wake!Room". */
  track: string | null;
  /** Festival day, `YYYY-MM-DD`. Late-night parties stay on the day they start. */
  date: string;
  /** Local Brussels time, `HH:mm`. */
  start: string | null;
  end: string | null;
  /** Absolute instants (ISO 8601, UTC). `endsAt` rolls over past midnight. */
  startsAt: string | null;
  endsAt: string | null;
  /** E.g. "Théâtre de Namur — Grande Salle" or "Le Delta". */
  venue: string | null;
  speakers: Person[];
  moderator: Person | null;
  intro: Localized | null;
  description: Localized | null;
  image: string | null;
  /** Without `image`. */
  gallery: string[];
  /** Of the gallery photos. */
  credit: string | null;
  tags: string[];
  language: string | null;
  websiteUrl: string | null;
  ticketUrl: string | null;
}

export interface EventsResponse {
  /** When the data was last fetched from KIKK successfully. */
  updatedAt: string;
  /** True when the latest refresh failed and older data is served. */
  stale: boolean;
  events: FestivalEvent[];
}
