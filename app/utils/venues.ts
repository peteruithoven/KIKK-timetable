export interface Venue {
  key: string;
  /** As in event venues, the building part (see `venueParts`). */
  name: string;
  /** `[longitude, latitude]`, MapLibre's order. */
  coordinates: [number, number];
}

/**
 * Festival places. Coordinates from kikkfestival.be/map, which hardcodes them as well, except
 * Église Saint-Loup, which it lacks (from OpenStreetMap). Le Pavillon, Le Beffroi and Institut
 * Saint-Louis only have installations.
 */
export const VENUES: Venue[] = [
  { key: "theatre", name: "Théâtre de Namur", coordinates: [4.867907, 50.464174] },
  { key: "bourse", name: "La Bourse", coordinates: [4.867362, 50.463549] },
  { key: "delta", name: "Le Delta", coordinates: [4.86899, 50.462604] },
  { key: "nef", name: "La Nef", coordinates: [4.871119, 50.463631] },
  { key: "saint-loup", name: "Église Saint-Loup", coordinates: [4.863271, 50.463987] },
  { key: "saint-louis", name: "Institut Saint-Louis", coordinates: [4.867709, 50.465127] },
  { key: "beffroi", name: "Le Beffroi", coordinates: [4.867046, 50.463884] },
  { key: "pavillon", name: "Le Pavillon", coordinates: [4.858922, 50.457431] },
];
