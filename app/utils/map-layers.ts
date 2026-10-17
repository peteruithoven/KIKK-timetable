import type {
  ExpressionSpecification,
  Map as MapLibreMap,
  StyleSpecification,
  SymbolLayerSpecification,
} from "maplibre-gl";

/** Of the venues other than the highlighted one. */
const DIMMED_OPACITY = 0.4;

/** Global state with the key of the highlighted venue, `""` for none. */
const HIGHLIGHTED_STATE = "highlightedVenue";

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
 * Adds the venue pins with their names to a style, for `setStyle`'s `transformStyle`, so they're
 * drawn along with the map instead of after it has loaded. Map layers rather than HTML markers, so
 * MapLibre hides labels that would overlap. Needs the image from `addPinImage()`.
 */
export function withVenueLayers(
  style: StyleSpecification,
  highlighted: string | null = null,
): StyleSpecification {
  // The highlighted venue on top.
  const venues = [
    ...VENUES.filter((venue) => venue.key !== highlighted),
    ...VENUES.filter((venue) => venue.key === highlighted),
  ];
  return {
    ...style,
    state: { ...style.state, [HIGHLIGHTED_STATE]: { default: highlighted ?? "" } },
    sources: {
      ...style.sources,
      venues: {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: VENUES.map((venue) => ({
            type: "Feature",
            properties: { key: venue.key, name: venue.name },
            geometry: { type: "Point", coordinates: venue.coordinates },
          })),
        },
      },
    },
    layers: [...style.layers, ...venues.map((venue) => venueLayerSpecification(venue.key))],
  };
}

function venueLayerSpecification(key: string): SymbolLayerSpecification {
  // Global state rather than `setPaintProperty()`, so a highlight from the URL is there from the
  // first frame. Changes to it fade like other paint changes.
  const opacity: ExpressionSpecification = [
    "case",
    ["==", ["global-state", HIGHLIGHTED_STATE], key],
    1,
    ["to-boolean", ["global-state", HIGHLIGHTED_STATE]],
    DIMMED_OPACITY,
    1,
  ];
  return {
    id: venueLayer(key),
    type: "symbol",
    source: "venues",
    filter: ["==", ["get", "key"], key],
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
      // Multi-line labels aligned towards their pin.
      "text-justify": "auto",
      // Pins stay when their label doesn't fit, zooming in brings it back.
      "text-optional": true,
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "#121212",
      "text-halo-width": 1.5,
      "icon-opacity": opacity,
      "text-opacity": opacity,
    },
  };
}

/**
 * Dims the other venues, `null` shows them all as normal. Keeps the view as it is. Call once the
 * style has loaded, `withVenueLayers()` sets the initial highlight.
 */
export function highlightVenue(map: MapLibreMap, key: string | null) {
  // Not null, that would reset it to the initial highlight.
  map.setGlobalStateProperty(HIGHLIGHTED_STATE, key ?? "");
  if (key && map.getLayer(venueLayer(key))) map.moveLayer(venueLayer(key));
}

/** White square with the cut top right corner of the Kikk style. Can be added before the style loads. */
export function addPinImage(map: MapLibreMap) {
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
