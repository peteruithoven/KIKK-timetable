import type { H3Event } from "h3";
import { fetchKikkData, fetchTrailData } from "./kikk-api";
import { toFestivalEvents, toInstallations } from "./kikk-mapping";

/** How long fetched data counts as fresh. */
const MAX_AGE = 5 * 60_000;
/** After a failed fetch, wait this long before trying again. */
const RETRY_DELAY = 60_000;

export interface KikkSnapshot<Data> {
  fetchedAt: string;
  data: Data;
}

interface Source<Data, Value> {
  /** Lowercase, for messages, e.g. "schedule". */
  name: string;
  storageKey: string;
  /** Committed fallback in server/assets/, updated with `vp run snapshot`. */
  snapshotKey: string;
  fetch: () => Promise<Data>;
  map: (data: Data) => Value;
}

interface Cached<Value> {
  /** When the data was last fetched from KIKK successfully. */
  updatedAt: string;
  /** True when the latest refresh failed and older data is served. */
  stale: boolean;
  value: Value;
}

/**
 * Serves data from KIKK, refreshing it when it is older than MAX_AGE. When KIKK can't be
 * reached, the last fetched data is served instead, or else the committed snapshot.
 */
function cachedSource<Data, Value>(source: Source<Data, Value>) {
  let latest: KikkSnapshot<Data> | null = null;
  let loadedFromStorage = false;
  let refreshing: Promise<KikkSnapshot<Data>> | null = null;
  let lastFailureAt = 0;
  let mapped: { fetchedAt: string; value: Value } | null = null;

  async function readLatest(): Promise<KikkSnapshot<Data> | null> {
    if (!latest && !loadedFromStorage) {
      loadedFromStorage = true;
      latest = await useStorage("data")
        .getItem<KikkSnapshot<Data>>(source.storageKey)
        .catch(() => null);
    }
    return latest;
  }

  function refresh(): Promise<KikkSnapshot<Data>> {
    refreshing ??= (async () => {
      try {
        const data = await source.fetch();
        const fresh = { fetchedAt: new Date().toISOString(), data };
        latest = fresh;
        await useStorage("data")
          .setItem(source.storageKey, fresh)
          .catch((error) => console.warn(`[kikk] could not persist ${source.name}:`, error));
        return fresh;
      } catch (error) {
        lastFailureAt = Date.now();
        console.warn(`[kikk] fetching ${source.name} failed:`, error);
        throw error;
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  }

  function respond(snapshot: KikkSnapshot<Data>): Cached<Value> {
    if (mapped?.fetchedAt !== snapshot.fetchedAt) {
      mapped = { fetchedAt: snapshot.fetchedAt, value: source.map(snapshot.data) };
    }
    return {
      updatedAt: snapshot.fetchedAt,
      stale: lastFailureAt > Date.parse(snapshot.fetchedAt),
      value: mapped.value,
    };
  }

  /** Without an event, e.g. in a background job, refreshes run unawaited. */
  return async (event?: H3Event): Promise<Cached<Value>> => {
    const current = await readLatest();
    const isFresh = current && Date.now() - Date.parse(current.fetchedAt) < MAX_AGE;
    const mayRetry = Date.now() - lastFailureAt > RETRY_DELAY;

    if (!isFresh && mayRetry) {
      const pending = refresh();
      if (current) {
        // Answer right away with what we have, update in the background.
        const settled = pending.catch(() => {});
        event?.waitUntil(settled);
      } else {
        try {
          return respond(await pending);
        } catch {
          // Fall through to the snapshot.
        }
      }
    }

    const fallback =
      current ??
      (await useStorage("assets:server").getItem<KikkSnapshot<Data>>(source.snapshotKey));
    if (!fallback) {
      throw createError({ statusCode: 503, statusMessage: `Unavailable: ${source.name}` });
    }
    return respond(fallback);
  };
}

const schedule = cachedSource({
  name: "schedule",
  storageKey: "kikk:latest",
  snapshotKey: "kikk-snapshot.json",
  fetch: () => fetchKikkData(useRuntimeConfig()),
  map: toFestivalEvents,
});

const trail = cachedSource({
  name: "art trail",
  storageKey: "kikk:trail",
  snapshotKey: "trail-snapshot.json",
  fetch: () => fetchTrailData(useRuntimeConfig()),
  map: toInstallations,
});

export async function getFestivalEvents(event?: H3Event): Promise<EventsResponse> {
  const { value: events, ...status } = await schedule(event);
  return { ...status, events };
}

export async function getInstallations(event?: H3Event): Promise<TrailResponse> {
  const { value: installations, ...status } = await trail(event);
  return { ...status, installations };
}
