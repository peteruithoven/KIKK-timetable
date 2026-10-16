// Fetches the raw schedule tables the way kikkfestival.be/schedule does.
// Kept free of Nitro auto-imports so scripts/update-snapshot.ts can use it.

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export const KIKK_SITE_URL = "https://kikkfestival.be";

const TABLES = ["conferences", "by_night_events", "panels"] as const;

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

async function fetchTable(config: SupabaseConfig, table: string): Promise<unknown[]> {
  const url = `${config.supabaseUrl}/rest/v1/${table}?select=*&status=eq.published&order=created_at.asc`;
  const response = await fetch(url, {
    headers: { apikey: config.supabaseKey, Authorization: `Bearer ${config.supabaseKey}` },
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
  if (!config.supabaseUrl || !config.supabaseKey) {
    throw new Error("Missing NUXT_SUPABASE_URL or NUXT_SUPABASE_KEY, see .env.example");
  }
  const [conferences, by_night_events, panels] = await Promise.all(
    TABLES.map((table) => fetchTable(config, table)),
  );
  return {
    conferences: conferences as ConferenceRow[],
    by_night_events: by_night_events as ByNightRow[],
    panels: panels as PanelRow[],
  };
}
