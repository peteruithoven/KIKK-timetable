import type { Map as MapLibreMap } from "maplibre-gl";

/** Of the venues other than the highlighted one. */
const DIMMED_OPACITY = 0.4;

const PIN_IMAGE = "pin";
const PIN_SIZE = 12;
const PIN_CORNER = 4;
const PIN_PIXEL_RATIO = 2;

/**
 * One layer per venue, so the highlighted one can be moved to the top, where its label is placed
 * first and isn't the one hidden when labels overlap. A `symbol-sort-key` would do that in one
 * layer, but changing a layout property lays out the symbols again, which fades them all out and
 * in.
 */
const venueLayer = (key: string) => `venue-${key}`;
const VENUE_LAYERS = VENUES.map((venue) => venueLayer(venue.key));

/**
 * Venue pins with their names. Map layers rather than HTML markers, so MapLibre hides labels
 * that would overlap. Call once the map's style has loaded.
 */
export function addVenueLayer(map: MapLibreMap, highlighted: string | null = null) {
  addPinImage(map);
  map.addSource("venues", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: VENUES.map((venue) => ({
        type: "Feature",
        properties: { key: venue.key, name: venue.name },
        geometry: { type: "Point", coordinates: venue.coordinates },
      })),
    },
  });
  for (const venue of VENUES) {
    map.addLayer({
      id: venueLayer(venue.key),
      type: "symbol",
      source: "venues",
      filter: ["==", ["get", "key"], venue.key],
      layout: {
        "icon-image": PIN_IMAGE,
        "icon-allow-overlap": true,
        "text-field": ["get", "name"],
        // The fonts OpenFreeMap serves.
        "text-font": ["Noto Sans Bold"],
        "text-size": 12,
        "text-transform": "uppercase",
        "text-letter-spacing": 0.1,
        "text-variable-anchor": ["left", "right", "top", "bottom"],
        "text-radial-offset": 0.9,
        // Pins stay when their label doesn't fit, zooming in brings it back.
        "text-optional": true,
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "#121212",
        "text-halo-width": 1.5,
      },
    });
  }
  highlightVenue(map, highlighted);
}

/** Dims the other venues, `null` shows them all as normal. Keeps the view as it is. */
export function highlightVenue(map: MapLibreMap, key: string | null) {
  for (const venue of VENUES) {
    const opacity = key && venue.key !== key ? DIMMED_OPACITY : 1;
    map.setPaintProperty(venueLayer(venue.key), "icon-opacity", opacity);
    map.setPaintProperty(venueLayer(venue.key), "text-opacity", opacity);
  }
  if (key && map.getLayer(venueLayer(key))) map.moveLayer(venueLayer(key));
}

/** White square with the cut top right corner of the Kikk style. */
function addPinImage(map: MapLibreMap) {
  if (map.hasImage(PIN_IMAGE)) return;
  const size = PIN_SIZE * PIN_PIXEL_RATIO;
  const corner = PIN_CORNER * PIN_PIXEL_RATIO;
  const context = document.createElement("canvas").getContext("2d")!;
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(size - corner, 0);
  context.lineTo(size, corner);
  context.lineTo(size, size);
  context.lineTo(0, size);
  context.fill();
  map.addImage(PIN_IMAGE, context.getImageData(0, 0, size, size), {
    pixelRatio: PIN_PIXEL_RATIO,
  });
}

/** Around the click, so pins are easy to hit with a finger. In pixels. */
const CLICK_MARGIN = 12;

/** Calls `onClick` with the key of the clicked venue, or null for clicks elsewhere on the map. */
export function onVenueClick(map: MapLibreMap, onClick: (key: string | null) => void) {
  map.on("click", ({ point }) => {
    const [feature] = map.queryRenderedFeatures(
      [
        [point.x - CLICK_MARGIN, point.y - CLICK_MARGIN],
        [point.x + CLICK_MARGIN, point.y + CLICK_MARGIN],
      ],
      { layers: VENUE_LAYERS },
    );
    onClick(feature?.properties.key ?? null);
  });
  map.on("mouseenter", VENUE_LAYERS, () => (map.getCanvas().style.cursor = "pointer"));
  map.on("mouseleave", VENUE_LAYERS, () => (map.getCanvas().style.cursor = ""));
}
