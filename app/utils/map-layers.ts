import type { Map as MapLibreMap } from "maplibre-gl";

const PIN_IMAGE = "pin";
const PIN_SIZE = 12;
const PIN_CORNER = 4;
const PIN_PIXEL_RATIO = 2;

/**
 * Venue pins with their names. A map layer rather than HTML markers, so MapLibre hides labels
 * that would overlap. Call once the map's style has loaded.
 */
export function addVenueLayer(map: MapLibreMap) {
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
  map.addLayer({
    id: "venues",
    type: "symbol",
    source: "venues",
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
