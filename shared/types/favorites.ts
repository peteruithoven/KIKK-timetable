export interface FavoritesList {
  /** Readable and unguessable enough, e.g. `brave-otter-4821`. Also the share link. */
  id: string;
  /** Set by its users, e.g. "Friday". Shared like the favorites. */
  label?: string;
  /** FestivalEvent and Installation ids. Named before installations could be favorites. */
  events: string[];
  updatedAt: string;
}
