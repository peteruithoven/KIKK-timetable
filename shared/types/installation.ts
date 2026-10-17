/** A work on the art trail. Open during the festival days rather than at set times. */
export interface Installation {
  /** E.g. `installation:<uuid>`. */
  id: string;
  /** Kikk's slug without its `-art-trail-kikk2026` suffix. */
  slug: string;
  /** Page on kikkfestival.be. */
  url: string;
  title: string;
  artist: Person | null;
  /** A place on the map, e.g. "Institut Saint-Louis". */
  venue: string | null;
  /** E.g. "2026" or "2023 - Present". */
  year: string | null;
  /** Materials and techniques, as the artist describes them. */
  medium: string | null;
  intro: Localized | null;
  description: Localized | null;
  /** For overviews. */
  image: string | null;
  /** For the page itself. */
  heroImage: string | null;
  /** Without the hero image. */
  gallery: string[];
  /** Of the gallery photos. */
  credit: string | null;
  tags: string[];
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
}

export interface TrailResponse {
  /** When the data was last fetched from KIKK successfully. */
  updatedAt: string;
  /** True when the latest refresh failed and older data is served. */
  stale: boolean;
  installations: Installation[];
}
