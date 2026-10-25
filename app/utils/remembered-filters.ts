import type { LocationQuery } from "vue-router";

/** Filters this device remembers, so revisiting the timetable or the map applies them again. */
interface RememberedFilters {
  /** Timetable venue, a key of VENUES, or "all". */
  venue?: string;
  /** Timetable "Only favorites". */
  favorites?: boolean;
  /** Art trail counts on the map. */
  trail?: boolean;
}

const STORAGE_KEY = "kikk-filters";

function readSaved(): RememberedFilters {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Saves a filter the visitor changed. Not for filters that came with a link. */
export function rememberFilters(filters: RememberedFilters) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readSaved(), ...filters }));
  } catch {
    // Storage can be unavailable, e.g. in private browsing. Then it's forgotten.
  }
}

/**
 * The query to open a page with, adding the remembered filters, or null to leave it as it is.
 * The timetable only gets them without any filter in its URL: a link that sets one (a venue on
 * the map, an event's day) opens as it says. The day isn't remembered, it opens on today.
 */
export function rememberedQuery(
  path: string,
  query: LocationQuery,
  hasFavorites: boolean,
): LocationQuery | null {
  const saved = readSaved();
  if (path === "/") {
    if (["day", "venue", "favorites", "q"].some((key) => key in query)) return null;
    const venue = VENUES.some((venue) => venue.key === saved.venue) ? saved.venue : undefined;
    const favorites = saved.favorites === true && hasFavorites;
    if (!venue && !favorites) return null;
    return { ...query, ...(venue && { venue }), ...(favorites && { favorites: null }) };
  }
  if (path === "/map" && saved.trail === true && !("trail" in query)) {
    return { ...query, trail: null };
  }
  return null;
}
