export interface FavoritesList {
  /** Readable and unguessable enough, e.g. `brave-otter-4821`. Also the share link. */
  id: string;
  /** FestivalEvent ids. */
  events: string[];
  updatedAt: string;
}
