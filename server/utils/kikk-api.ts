// Fetches the raw schedule tables the way kikkfestival.be/schedule does, and the art trail.
// Kept free of Nitro auto-imports so scripts/update-snapshot.ts can use it.

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

/** Adds the Supabase project of Kikk's art trail app, exhibitions.kikkfestival.be. */
export interface TrailConfig extends SupabaseConfig {
  trailSupabaseUrl: string;
  trailSupabaseKey: string;
}

export const KIKK_SITE_URL = "https://kikkfestival.be";

const TABLES = ["conferences", "by_night_events", "panels"] as const;
const PUBLISHED = "select=*&status=eq.published&order=created_at.asc";

type Nullable<T> = { [K in keyof T]: T[K] | null };

interface BaseRow {
  id: string;
  slug: string;
  title: string;
  start_time: string;
  end_time: string;
  room_name: string;
  description: string;
  description_en: string;
  intro_text: string;
  intro_text_en: string;
  image_url: string;
  hero_image_url: string;
  gallery_images: string[];
  carousel_credit: string;
  tags: string[];
}

export type ConferenceRow = Nullable<
  BaseRow & {
    date: string;
    location: string;
    thematic_room: string;
    speaker_name: string;
    company_studio: string;
    speaker_bio: string;
    speaker_bio_en: string;
    speaker_location: string;
    speaker_location_fr: string;
    language: string;
    website_url: string;
  }
>;

export type ByNightRow = Nullable<
  BaseRow & {
    event_date: string;
    venue: string;
    artist_name: string;
    website_url: string;
    ticket_url: string;
  }
>;

export interface PanelPersonRow {
  full_name?: string | null;
  company?: string | null;
  role?: string | null;
  role_en?: string | null;
  description?: string | null;
  description_en?: string | null;
  photo_url?: string | null;
}

export type PanelRow = Nullable<
  BaseRow & {
    event_date: string;
    location: string;
    room: string;
    language: string;
    speakers: PanelPersonRow[];
    moderator: PanelPersonRow;
  }
>;

export interface KikkData {
  conferences: ConferenceRow[];
  by_night_events: ByNightRow[];
  panels: PanelRow[];
}

/** An art trail work on kikkfestival.be/public/art-trail. */
export type InstallationRow = Nullable<{
  id: string;
  slug: string;
  title: string;
  artist_name: string;
  artist_bio: string;
  artist_bio_en: string;
  description: string;
  description_en: string;
  intro_text: string;
  intro_text_en: string;
  image_url: string;
  hero_image_url: string;
  gallery_images: string[];
  carousel_credit: string;
  /** Sometimes the place, mostly the artist's country. */
  location: string;
  tags: string[];
  website_url: string;
  instagram_url: string;
  facebook_url: string;
}>;

/** The same work in the art trail app, which knows where it is. Only the columns used. */
export type TrailEntryRow = Nullable<{
  title: string;
  location_id: string;
  artist_id: string;
  year_display: string;
  materials: string;
}>;

export type TrailLocationRow = Nullable<{ id: string; name: string }>;

export type TrailArtistRow = Nullable<{ id: string; display_name: string; portrait_url: string }>;

export interface TrailData {
  installations: InstallationRow[];
  /** From the art trail app. */
  entries: TrailEntryRow[];
  locations: TrailLocationRow[];
  artists: TrailArtistRow[];
}

interface Project {
  url: string;
  key: string;
}

function project(url: string, key: string, env: string): Project {
  if (!url || !key) throw new Error(`Missing ${env}_URL or ${env}_KEY, see .env.example`);
  return { url, key };
}

async function fetchTable({ url, key }: Project, table: string, query: string): Promise<unknown[]> {
  const response = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`${table}: HTTP ${response.status} ${response.statusText}`);
  }
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) throw new Error(`${table}: expected an array`);
  // Revoked access usually shows up as empty results rather than an error.
  if (rows.length === 0) throw new Error(`${table}: no rows`);
  return rows;
}

export async function fetchKikkData(config: SupabaseConfig): Promise<KikkData> {
  const kikk = project(config.supabaseUrl, config.supabaseKey, "NUXT_SUPABASE");
  const [conferences, by_night_events, panels] = await Promise.all(
    TABLES.map((table) => fetchTable(kikk, table, PUBLISHED)),
  );
  return {
    conferences: conferences as ConferenceRow[],
    by_night_events: by_night_events as ByNightRow[],
    panels: panels as PanelRow[],
  };
}

/** The works from kikkfestival.be, their places and more from the art trail app. */
export async function fetchTrailData(config: TrailConfig): Promise<TrailData> {
  const kikk = project(config.supabaseUrl, config.supabaseKey, "NUXT_SUPABASE");
  const trail = project(config.trailSupabaseUrl, config.trailSupabaseKey, "NUXT_TRAIL_SUPABASE");
  const [installations, entries, locations, artists] = await Promise.all([
    fetchTable(kikk, "installations", PUBLISHED),
    // Its events are in the schedule.
    fetchTable(
      trail,
      "entries",
      "select=title,location_id,artist_id,year_display,materials&is_published=eq.true&category=neq.Event",
    ),
    fetchTable(trail, "locations", "select=id,name"),
    fetchTable(trail, "artists", "select=id,display_name,portrait_url"),
  ]);
  return {
    installations: installations as InstallationRow[],
    entries: entries as TrailEntryRow[],
    locations: locations as TrailLocationRow[],
    artists: artists as TrailArtistRow[],
  };
}
