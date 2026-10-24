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

/** Global state, whether the art trail badges are shown. */
const SHOW_TRAIL_STATE = "showTrail";

const BADGE_IMAGE = "trail-badge";
const BADGE_SIZE = 16;
const BADGE_CORNER = 4;
/** Badge center from the pin center, towards the top right, overlapping the pin's corner. */
const BADGE_OFFSET = 9;
const BADGE_TEXT_SIZE = 10;
const BADGE_LAYER = "venue-trail-badges";

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
      badgeLayerSpecification(),
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
      "icon-opacity": opacity,
      "text-opacity": opacity,
    },
  };
}

/**
 * The number of art trail works on the top right corner of the pins. Above the venue layers, so
 * it's placed first and labels make room for it. A filter rather than an opacity, so hidden
 * badges don't push labels away.
 */
function badgeLayerSpecification(): SymbolLayerSpecification {
  const opacity = highlightOpacity(["get", "key"]);
  return {
    id: BADGE_LAYER,
    type: "symbol",
    source: "venues",
    filter: [
      "all",
      ["to-boolean", ["global-state", SHOW_TRAIL_STATE]],
      [">", ["get", "trailCount"], 0],
    ],
    layout: {
      "icon-image": BADGE_IMAGE,
      "icon-offset": [BADGE_OFFSET, -BADGE_OFFSET],
      "icon-allow-overlap": true,
      "text-field": ["to-string", ["get", "trailCount"]],
      "text-font": ["Noto Sans Bold"],
      "text-size": BADGE_TEXT_SIZE,
      // In ems.
      "text-offset": [BADGE_OFFSET / BADGE_TEXT_SIZE, -BADGE_OFFSET / BADGE_TEXT_SIZE],
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#121212",
      "icon-opacity": opacity,
      "text-opacity": opacity,
    },
  };
}

/** Shows or hides the art trail badges. Call once the style has loaded. */
export function showTrailBadges(map: MapLibreMap, show: boolean) {
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
  // The badges stay on top.
  if (map.getLayer(BADGE_LAYER)) map.moveLayer(BADGE_LAYER);
}

/**
 * The pin and the badge background: white squares with the cut top right corner of the Kikk
 * style, the badge with a dark border to set it off from the pin. Can be added before the style
 * loads.
 */
export function addPinImages(map: MapLibreMap) {
  if (!map.hasImage(PIN_IMAGE)) map.addImage(PIN_IMAGE, ...cornerSquare(PIN_SIZE, PIN_CORNER));
  if (!map.hasImage(BADGE_IMAGE)) {
    map.addImage(BADGE_IMAGE, ...cornerSquare(BADGE_SIZE, BADGE_CORNER, 1.5));
  }
}

function cornerSquare(
  size: number,
  corner: number,
  border = 0,
): [ImageData, { pixelRatio: number }] {
  const [s, c, b] = [size, corner, border].map((value) => value * PIN_PIXEL_RATIO) as [
    number,
    number,
    number,
  ];
  const context = document.createElement("canvas").getContext("2d")!;
  const path = (inset: number) => {
    // The diagonal moves in further than the straight sides.
    const diagonal = inset * (Math.SQRT2 - 1);
    context.beginPath();
    context.moveTo(inset, inset);
    context.lineTo(s - c - diagonal, inset);
    context.lineTo(s - inset, c + diagonal);
    context.lineTo(s - inset, s - inset);
    context.lineTo(inset, s - inset);
    context.fill();
  };
  if (b) {
    context.fillStyle = "#121212";
    path(0);
  }
  context.fillStyle = "#ffffff";
  path(b);
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
      { layers: [...VENUE_LAYERS, BADGE_LAYER] },
    );
    onClick(feature?.properties.key ?? null);
  });
  map.on("mouseenter", VENUE_LAYERS, () => (map.getCanvas().style.cursor = "pointer"));
  map.on("mouseleave", VENUE_LAYERS, () => (map.getCanvas().style.cursor = ""));
}
