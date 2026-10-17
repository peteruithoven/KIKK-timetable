/** What overviews of the art trail need. */
export type TrailItem = Pick<Installation, "id" | "slug" | "title" | "venue" | "image"> & {
  artist: string | null;
};

export interface TrailGroup {
  /** Of the place on the map, also the group's anchor on /trail. */
  key: string | null;
  name: string;
  mapPath: string | null;
  items: TrailItem[];
}

export function installationPath(installation: Pick<Installation, "slug">): string {
  return `/trail/${installation.slug}`;
}

/**
 * Groups works by place, north to south: roughly a walk from Institut Saint-Louis down to the
 * citadel. Places that aren't on the map come last.
 */
export function groupByVenue(items: TrailItem[]): TrailGroup[] {
  const groups = new Map<string, { group: TrailGroup; latitude: number }>();
  for (const item of items) {
    const place = findVenue(item.venue);
    const name = place?.name ?? item.venue ?? "Elsewhere";
    let entry = groups.get(name);
    if (!entry) {
      const mapPath = place ? venueMapPath(place.name) : null;
      entry = {
        group: { key: place?.key ?? null, name, mapPath, items: [] },
        latitude: place?.coordinates[1] ?? -Infinity,
      };
      groups.set(name, entry);
    }
    entry.group.items.push(item);
  }
  return [...groups.values()].sort((a, b) => b.latitude - a.latitude).map(({ group }) => group);
}
