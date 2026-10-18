export interface Venue {
  key: string;
  /** As in event venues, the building part (see `venueParts`). */
  name: string;
  /** `[longitude, latitude]`, MapLibre's order. */
  coordinates: [number, number];
  /** All are in 5000 Namur. */
  street: string;
}

/**
 * Festival places. Coordinates from kikkfestival.be/map, which hardcodes them as well, except
 * Église Saint-Loup, which it lacks (from OpenStreetMap), and the art trail places it lacks or
 * puts elsewhere (from the `locations` of the art trail app, exhibitions.kikkfestival.be).
 * Le Pavillon, Institut Saint-Louis, Galerie du Beffroi, Magma and Place d'Armes only have
 * installations. Addresses from the art trail app as well, except Théâtre de Namur, La Nef and
 * Église Saint-Loup (17 is officially its presbytery, the church itself has no number).
 */
export const VENUES: Venue[] = [
  {
    key: "theatre",
    name: "Théâtre de Namur",
    coordinates: [4.867907, 50.464174],
    street: "Place du Théâtre 2",
  },
  {
    key: "bourse",
    name: "La Bourse",
    coordinates: [4.867362, 50.463549],
    street: "Place d'Armes 1",
  },
  {
    key: "delta",
    name: "Le Delta",
    coordinates: [4.86899, 50.462604],
    street: "Avenue Fernand Golenvaux 18",
  },
  { key: "nef", name: "La Nef", coordinates: [4.871119, 50.463631], street: "Rue Saint-Nicolas 2" },
  {
    key: "saint-loup",
    name: "Église Saint-Loup",
    coordinates: [4.863271, 50.463987],
    street: "Rue du Collège 17",
  },
  {
    key: "saint-louis",
    name: "Institut Saint-Louis",
    coordinates: [4.867709, 50.465127],
    street: "Rue Pépin 7",
  },
  // kikkfestival.be/map calls it Le Beffroi, the art trail app Galerie de Namur. This is the
  // name on the printed festival map.
  {
    key: "beffroi",
    name: "Galerie du Beffroi",
    coordinates: [4.866797, 50.463822],
    street: "Rue du Beffroi 13",
  },
  {
    key: "magma",
    name: "Magma",
    coordinates: [4.867412, 50.463962],
    street: "Rue Emile Cuvelier 11",
  },
  {
    key: "place-d-armes",
    name: "Place d'Armes",
    coordinates: [4.867484, 50.463196],
    street: "Place d'Armes",
  },
  {
    key: "pavillon",
    name: "Le Pavillon",
    coordinates: [4.858922, 50.457431],
    street: "Route Merveilleuse 65",
  },
];

/** The place of an event venue, e.g. `"La Bourse — Auditoire Rops"` → La Bourse. */
export function findVenue(venue: string | null): Venue | undefined {
  if (!venue) return undefined;
  const { building, room } = venueParts(venue);
  return VENUES.find((place) => place.name === (building ?? room));
}

/** `"La Bourse — Auditoire Rops"` → `"/map?venue=bourse"`, null for places not on the map. */
export function venueMapPath(venue: string): string | null {
  const key = findVenue(venue)?.key;
  return key ? `/map?venue=${key}` : null;
}

/**
 * Directions in Google Maps (its app when installed). There's no well supported link that lets
 * people pick their own maps app, `geo:` URIs don't work on iOS and desktop.
 */
export function venueDirectionsUrl(venue: Venue): string {
  const [longitude, latitude] = venue.coordinates;
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}
