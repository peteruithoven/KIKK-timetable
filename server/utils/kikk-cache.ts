import type { H3Event } from "h3";
import { fetchKikkData, type KikkData } from "./kikk-api";
import { toFestivalEvents } from "./kikk-mapping";

/** How long fetched data counts as fresh. */
const MAX_AGE = 5 * 60_000;
/** After a failed fetch, wait this long before trying again. */
const RETRY_DELAY = 60_000;
const STORAGE_KEY = "kikk:latest";
/** Committed fallback in server/assets/, updated with `vp run snapshot`. */
const SNAPSHOT_KEY = "kikk-snapshot.json";

export interface KikkSnapshot {
  fetchedAt: string;
  data: KikkData;
}

let latest: KikkSnapshot | null = null;
let loadedFromStorage = false;
let refreshing: Promise<KikkSnapshot> | null = null;
let lastFailureAt = 0;
let mapped: { fetchedAt: string; events: FestivalEvent[] } | null = null;

async function readLatest(): Promise<KikkSnapshot | null> {
  if (!latest && !loadedFromStorage) {
    loadedFromStorage = true;
    latest = await useStorage("data")
      .getItem<KikkSnapshot>(STORAGE_KEY)
      .catch(() => null);
  }
  return latest;
}

function refresh(): Promise<KikkSnapshot> {
  refreshing ??= (async () => {
    try {
      const data = await fetchKikkData(useRuntimeConfig());
      const fresh = { fetchedAt: new Date().toISOString(), data };
      latest = fresh;
      await useStorage("data")
        .setItem(STORAGE_KEY, fresh)
        .catch((error) => console.warn("[kikk] could not persist schedule:", error));
      return fresh;
    } catch (error) {
      lastFailureAt = Date.now();
      console.warn("[kikk] fetching schedule failed:", error);
      throw error;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

function respond(snapshot: KikkSnapshot): EventsResponse {
  if (mapped?.fetchedAt !== snapshot.fetchedAt) {
    mapped = { fetchedAt: snapshot.fetchedAt, events: toFestivalEvents(snapshot.data) };
  }
  return {
    updatedAt: snapshot.fetchedAt,
    stale: lastFailureAt > Date.parse(snapshot.fetchedAt),
    events: mapped.events,
  };
}

/**
 * Serves the schedule, refreshing it from KIKK when it is older than MAX_AGE.
 * When KIKK can't be reached, the last fetched data is served instead.
 */
export async function getFestivalEvents(event: H3Event): Promise<EventsResponse> {
  const current = await readLatest();
  const isFresh = current && Date.now() - Date.parse(current.fetchedAt) < MAX_AGE;
  const mayRetry = Date.now() - lastFailureAt > RETRY_DELAY;

  if (!isFresh && mayRetry) {
    const pending = refresh();
    if (current) {
      // Answer right away with what we have, update in the background.
      event.waitUntil(pending.catch(() => {}));
    } else {
      try {
        return respond(await pending);
      } catch {
        // Fall through to the snapshot.
      }
    }
  }

  const fallback =
    current ?? (await useStorage("assets:server").getItem<KikkSnapshot>(SNAPSHOT_KEY));
  if (!fallback) {
    throw createError({ statusCode: 503, statusMessage: "Schedule unavailable" });
  }
  return respond(fallback);
}
