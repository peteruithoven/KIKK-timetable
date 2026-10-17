import type { LayerSpecification, StyleSpecification } from "maplibre-gl";

const WATER_COLOR = "rgb(16, 16, 36)";
/** Of grass and woods. */
const GREEN_COLOR = "rgb(22, 30, 22)";

/**
 * Changes to OpenFreeMap's dark style, by layer id: brighter streets, buildings and water, so the
 * map is easier to find your way with. `null` removes a property. Ids missing from the style are
 * skipped.
 */
const PAINT_OVERRIDES: Record<string, Record<string, string | number | null>> = {
  water: { "fill-color": WATER_COLOR },
  // Its pattern image isn't served, which hides the layer. Opaque, like the grass.
  landcover_wood: { "fill-pattern": null, "fill-color": GREEN_COLOR, "fill-opacity": 1 },
  // Smaller rivers and canals, drawn as lines.
  waterway: { "line-color": WATER_COLOR },
  building: { "fill-color": "rgb(32, 32, 32)", "fill-outline-color": "rgb(52, 52, 52)" },
  highway_path: { "line-color": "rgb(43, 43, 46)" },
  highway_minor: { "line-color": "rgb(34, 34, 34)" },
  highway_name_other: { "text-color": "rgb(125, 125, 125)" },
};

/**
 * Layers the dark style doesn't have, each added after the layer with the id in `after` (and not
 * at all if that's missing). The other OpenFreeMap styles use the same tiles, so their layers can
 * be copied from them.
 */
const ADDED_LAYERS: { after: string; layer: LayerSpecification }[] = [
  {
    // Lawns, meadows and the like, from the bright style. Below roads and buildings.
    after: "landuse_park",
    layer: {
      id: "landcover_grass",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      filter: ["==", ["get", "class"], "grass"],
      paint: { "fill-color": GREEN_COLOR },
    },
  },
];

/** Applies `PAINT_OVERRIDES` and `ADDED_LAYERS`, for `setStyle`'s `transformStyle`. */
export function withStyleTweaks(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    layers: style.layers.flatMap((layer) => {
      const paint = PAINT_OVERRIDES[layer.id];
      const tweaked = paint
        ? ({
            ...layer,
            paint: Object.fromEntries(
              Object.entries({ ...layer.paint, ...paint }).filter(([, value]) => value !== null),
            ),
          } as LayerSpecification)
        : layer;
      const added = ADDED_LAYERS.filter(({ after }) => after === layer.id);
      return [tweaked, ...added.map(({ layer }) => layer)];
    }),
  };
}
