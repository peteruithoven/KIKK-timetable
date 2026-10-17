import type { H3Event } from "h3";

const MAX_EVENTS = 300;
const EVENT_ID_PATTERN = /^(talk|panel|party):[0-9a-f-]{36}$/;
const COOKIE_MAX_AGE = 400 * 24 * 60 * 60; // The maximum browsers allow.

// prettier-ignore
const ADJECTIVES = [
  "amber", "bold", "brave", "bright", "calm", "clever", "cosmic", "crisp", "curious", "daring",
  "dreamy", "eager", "electric", "fancy", "fierce", "fluffy", "frosty", "gentle", "giant", "glowing",
  "golden", "happy", "hidden", "humble", "jolly", "kind", "lively", "lucky", "lunar", "magic",
  "mellow", "merry", "mighty", "misty", "neon", "nimble", "noble", "orange", "pixel", "playful",
  "polar", "quick", "quiet", "rapid", "rosy", "royal", "rusty", "shiny", "silent", "silver",
  "sleepy", "smooth", "snowy", "solar", "sonic", "spicy", "sunny", "swift", "tidy", "velvet",
  "vivid", "wild", "witty", "zesty",
];

// prettier-ignore
const NOUNS = [
  "badger", "beacon", "bear", "beetle", "bison", "cactus", "comet", "coral", "crane", "dolphin",
  "dragon", "eagle", "falcon", "fern", "ferret", "finch", "fox", "gecko", "heron", "koala",
  "lemur", "lion", "llama", "lynx", "magpie", "maple", "meteor", "moose", "moth", "nebula",
  "newt", "octopus", "orbit", "otter", "owl", "panda", "parrot", "pebble", "pigeon", "pixel",
  "planet", "puffin", "quasar", "rabbit", "raven", "robin", "rocket", "salmon", "seal", "shark",
  "sparrow", "squid", "star", "swan", "tiger", "toucan", "turtle", "walrus", "whale", "willow",
  "wolf", "wombat", "yak", "zebra",
];

export interface ListChanges {
  add?: string[];
  remove?: string[];
}

const storage = () => useStorage("data");
const storageKey = (id: string) => `favorites:${id}`;

function pick<T>(items: readonly T[]): T {
  return items[crypto.getRandomValues(new Uint32Array(1))[0]! % items.length]!;
}

async function createListId(): Promise<string> {
  for (;;) {
    const number = 1000 + (crypto.getRandomValues(new Uint32Array(1))[0]! % 9000);
    const id = `${pick(ADJECTIVES)}-${pick(NOUNS)}-${number}`;
    if (!(await storage().hasItem(storageKey(id)))) return id;
  }
}

/**
 * As stored. `paths` links each favorite to its `kind/slug`, so a favorite can be found again
 * when Kikk deletes and re-creates an event under a new id.
 */
interface StoredList extends FavoritesList {
  paths?: Record<string, string>;
}

const eventPath = (event: Pick<FestivalEvent, "kind" | "slug">) => `${event.kind}/${event.slug}`;

/** Links favorites to the current schedule: follows re-created events by slug and fills in slugs. */
async function reconcile(event: H3Event, list: StoredList): Promise<StoredList> {
  const { events } = await getFestivalEvents(event);
  const byId = new Map(events.map((e) => [e.id, e]));
  const byPath = new Map(events.map((e) => [eventPath(e), e]));
  const ids = new Set<string>();
  const paths: Record<string, string> = {};
  for (const id of list.events) {
    const path = list.paths?.[id];
    const current = byId.get(id) ?? (path ? byPath.get(path) : undefined);
    if (current) {
      ids.add(current.id);
      paths[current.id] = eventPath(current);
    } else {
      // Not in the schedule (anymore). Kept, in case it returns.
      ids.add(id);
      if (path) paths[id] = path;
    }
  }
  return { ...list, events: [...ids], paths };
}

function toPublic({ id, events, updatedAt }: StoredList): FavoritesList {
  return { id, events, updatedAt };
}

export function readList(event: H3Event, id: string): Promise<FavoritesList | null> {
  return withLock(id, async () => {
    const stored = await storage().getItem<StoredList>(storageKey(id));
    if (!stored) return null;
    const reconciled = await reconcile(event, stored);
    if (JSON.stringify(reconciled) === JSON.stringify({ ...stored, paths: stored.paths ?? {} })) {
      return toPublic(stored);
    }
    const eventsChanged = reconciled.events.join() !== stored.events.join();
    const list = {
      ...reconciled,
      updatedAt: eventsChanged ? new Date().toISOString() : stored.updatedAt,
    };
    await storage().setItem(storageKey(id), list);
    return toPublic(list);
  });
}

// Serializes changes per list, so concurrent requests don't overwrite each other.
const locks = new Map<string, Promise<unknown>>();
function withLock<T>(id: string, task: () => Promise<T>): Promise<T> {
  const result = (locks.get(id) ?? Promise.resolve()).then(task, task);
  const settled = result.catch(() => {});
  locks.set(id, settled);
  void settled.then(() => locks.get(id) === settled && locks.delete(id));
  return result;
}

/** Applies changes to a list. Creates it when `create` is set, otherwise returns null when missing. */
export async function updateList(
  event: H3Event,
  id: string | undefined,
  changes: ListChanges,
  { create = false } = {},
): Promise<FavoritesList | null> {
  const listId = id ?? (await createListId());
  return withLock(listId, async () => {
    const current = await storage().getItem<StoredList>(storageKey(listId));
    if (!current && !create) return null;
    const events = new Set(current?.events);
    for (const eventId of changes.add ?? []) events.add(eventId);
    for (const eventId of changes.remove ?? []) events.delete(eventId);
    if (events.size > MAX_EVENTS) {
      throw createError({ statusCode: 422, statusMessage: `At most ${MAX_EVENTS} favorites` });
    }
    const list = await reconcile(event, {
      id: listId,
      events: [...events],
      paths: current?.paths,
      updatedAt: new Date().toISOString(),
    });
    await storage().setItem(storageKey(listId), list);
    return toPublic(list);
  });
}

export function parseListId(value: unknown): string {
  if (typeof value !== "string" || !LIST_ID_PATTERN.test(value)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid list id" });
  }
  return value;
}

export function parseChanges(body: unknown): ListChanges {
  const { add, remove } = (body ?? {}) as Record<string, unknown>;
  return { add: parseEventIds(add), remove: parseEventIds(remove) };
}

function parseEventIds(value: unknown): string[] {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.length > MAX_EVENTS ||
    !value.every((id) => typeof id === "string" && EVENT_ID_PATTERN.test(id))
  ) {
    throw createError({ statusCode: 400, statusMessage: "Invalid event ids" });
  }
  return value;
}

export function setListCookie(event: H3Event, id: string): void {
  setCookie(event, LIST_COOKIE, id, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: getRequestProtocol(event, { xForwardedProto: true }) === "https",
  });
}
