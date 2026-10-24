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

/** Global state, whether the pins show their number of art trail works. */
const SHOW_TRAIL_STATE = "showTrail";

/** A larger pin, to fit the number. Still clear of the labels' `text-radial-offset`. */
const COUNT_PIN_IMAGE = "count-pin";
const COUNT_PIN_SIZE = 16;
const COUNT_PIN_TEXT_SIZE = 10;
const COUNT_LAYER = "venue-trail-counts";

/**
 * One layer per venue, so the highlighted one can be moved to the top, where its label is placed
 * first and isn't the one hidden when labels overlap. A `symbol-sort-key` would do that in one
 * layer, but changing a layout property lays out the symbols again, which fades them all out and
 * in.
 */
const venueLayer = (key: string) => `venue-${key}`;
const VENUE_LAYERS = VENUES.map((venue) => venueLayer(venue.key));

export interface VenueLayerOptions {
  /** Key of the highlighted venue. */
  highlighted?: string | null;
  /** Art trail works per venue key, for the badges. */
  trailCounts?: Record<string, number>;
  /** Whether the badges are shown. */
  showTrail?: boolean;
}

/**
 * Adds the venue pins with their names to a style, for `setStyle`'s `transformStyle`, so they're
 * drawn along with the map instead of after it has loaded. Map layers rather than HTML markers, so
 * MapLibre hides labels that would overlap. Needs the images from `addPinImages()`.
 */
export function withVenueLayers(
  style: StyleSpecification,
  { highlighted = null, trailCounts = {}, showTrail = false }: VenueLayerOptions = {},
): StyleSpecification {
  // The highlighted venue on top.
  const venues = [
    ...VENUES.filter((venue) => venue.key !== highlighted),
    ...VENUES.filter((venue) => venue.key === highlighted),
  ];
  return {
    ...style,
    state: {
      ...style.state,
      [HIGHLIGHTED_STATE]: { default: highlighted ?? "" },
      [SHOW_TRAIL_STATE]: { default: showTrail },
    },
    sources: {
      ...style.sources,
      venues: {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: VENUES.map((venue) => ({
            type: "Feature",
            properties: {
              key: venue.key,
              name: venue.name,
              trailCount: trailCounts[venue.key] ?? 0,
            },
            geometry: { type: "Point", coordinates: venue.coordinates },
          })),
        },
      },
    },
    layers: [
      ...style.layers,
      ...venues.map((venue) => venueLayerSpecification(venue.key)),
      countLayerSpecification(),
    ],
  };
}

/** Dims all but the highlighted venue. */
function highlightOpacity(key: ExpressionSpecification | string): ExpressionSpecification {
  // Global state rather than `setPaintProperty()`, so a highlight from the URL is there from the
  // first frame. Changes to it fade like other paint changes.
  return [
    "case",
    ["==", ["global-state", HIGHLIGHTED_STATE], key],
    1,
    ["to-boolean", ["global-state", HIGHLIGHTED_STATE]],
    DIMMED_OPACITY,
    1,
  ];
}

/** Whether a venue's pin is replaced by one with its number of art trail works. */
const SHOWS_COUNT: ExpressionSpecification = [
  "all",
  ["to-boolean", ["global-state", SHOW_TRAIL_STATE]],
  [">", ["get", "trailCount"], 0],
];

function venueLayerSpecification(key: string): SymbolLayerSpecification {
  const opacity = highlightOpacity(key);
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
      // Hidden under the pin with the number.
      "icon-opacity": ["case", SHOWS_COUNT, 0, opacity],
      "text-opacity": opacity,
    },
  };
}

/**
 * Pins with the number of art trail works in them, drawn over the venue pins. Their own layer,
 * since changing the venue layers' `icon-image` would lay out the symbols again, which fades them
 * all out and in.
 */
function countLayerSpecification(): SymbolLayerSpecification {
  const opacity = highlightOpacity(["get", "key"]);
  return {
    id: COUNT_LAYER,
    type: "symbol",
    source: "venues",
    filter: SHOWS_COUNT,
    layout: {
      "icon-image": COUNT_PIN_IMAGE,
      "icon-allow-overlap": true,
      "text-field": ["to-string", ["get", "trailCount"]],
      "text-font": ["Noto Sans Bold"],
      "text-size": COUNT_PIN_TEXT_SIZE,
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#121212",
      "icon-opacity": opacity,
      "text-opacity": opacity,
    },
  };
}

/** Shows or hides the numbers of art trail works in the pins. Call once the style has loaded. */
export function showTrailCounts(map: MapLibreMap, show: boolean) {
  map.setGlobalStateProperty(SHOW_TRAIL_STATE, show);
}

/**
 * Dims the other venues, `null` shows them all as normal. Keeps the view as it is. Call once the
 * style has loaded, `withVenueLayers()` sets the initial highlight.
 */
export function highlightVenue(map: MapLibreMap, key: string | null) {
  // Not null, that would reset it to the initial highlight.
  map.setGlobalStateProperty(HIGHLIGHTED_STATE, key ?? "");
  if (key && map.getLayer(venueLayer(key))) map.moveLayer(venueLayer(key));
  // The pins with numbers stay on top of the pins they cover.
  if (map.getLayer(COUNT_LAYER)) map.moveLayer(COUNT_LAYER);
}

/**
 * White squares with the cut top right corner of the Kikk style, the pin and the larger one for
 * numbers. Can be added before the style loads.
 */
export function addPinImages(map: MapLibreMap) {
  if (!map.hasImage(PIN_IMAGE)) map.addImage(PIN_IMAGE, ...cornerSquare(PIN_SIZE));
  if (!map.hasImage(COUNT_PIN_IMAGE)) {
    map.addImage(COUNT_PIN_IMAGE, ...cornerSquare(COUNT_PIN_SIZE));
  }
}

function cornerSquare(size: number): [ImageData, { pixelRatio: number }] {
  const s = size * PIN_PIXEL_RATIO;
  const corner = PIN_CORNER * PIN_PIXEL_RATIO;
  const context = document.createElement("canvas").getContext("2d")!;
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(s - corner, 0);
  context.lineTo(s, corner);
  context.lineTo(s, s);
  context.lineTo(0, s);
  context.fill();
  return [context.getImageData(0, 0, s, s), { pixelRatio: PIN_PIXEL_RATIO }];
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
      { layers: [...VENUE_LAYERS, COUNT_LAYER] },
    );
    onClick(feature?.properties.key ?? null);
  });
  map.on("mouseenter", VENUE_LAYERS, () => (map.getCanvas().style.cursor = "pointer"));
  map.on("mouseleave", VENUE_LAYERS, () => (map.getCanvas().style.cursor = ""));
}
