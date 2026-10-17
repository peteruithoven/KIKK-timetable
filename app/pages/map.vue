<script setup lang="ts">
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre builds its worker URL at runtime, which bundlers can't follow, so the worker is
// added as an asset here.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

const route = useRoute();
const router = useRouter();

// `/map?venue=bourse`, see VENUES for the keys.
const highlightedVenue = computed(() =>
  typeof route.query.venue === "string" ? route.query.venue : null,
);

const container = useTemplateRef<HTMLDivElement>("container");
let map: MapLibreMap | undefined;
let layersAdded = false;

onMounted(async () => {
  // MapLibre needs WebGL and the DOM, and it's big, so it's only loaded on this page.
  const { Map, LngLatBounds, setWorkerUrl } = await import("maplibre-gl");
  if (!container.value) return;
  setWorkerUrl(workerUrl);
  const bounds = new LngLatBounds();
  for (const venue of VENUES) bounds.extend(venue.coordinates);
  const instance = new Map({
    container: container.value,
    style: "https://tiles.openfreemap.org/styles/dark",
    bounds,
    fitBoundsOptions: { padding: 48 },
    // The full text instead of an info button.
    attributionControl: { compact: false },
  });
  instance.once("load", () => {
    addVenueLayer(instance, highlightedVenue.value);
    layersAdded = true;
  });
  map = instance;
});

watch(highlightedVenue, (key) => {
  if (map && layersAdded) highlightVenue(map, key);
});

onBeforeUnmount(() => map?.remove());

// Back to where we came from (timetable or event page), as it was.
function goBack(clickEvent: MouseEvent) {
  if (window.history.state?.back) {
    clickEvent.preventDefault();
    router.back();
  }
}

useSeoMeta({ title: "Map · KIKK 2026" });
</script>

<template>
  <div class="flex h-dvh flex-col">
    <nav class="flex items-center gap-3 border-b border-line bg-paper px-4 py-3">
      <a
        href="/"
        class="inline-flex items-center gap-2 bevel-corner border border-line px-3 py-1.5 font-display text-xs font-semibold tracking-[0.12em] uppercase transition-colors hover:border-ink"
        @click="goBack"
      >
        <Icon name="material-symbols:arrow-left-alt" class="size-4" aria-hidden="true" /> Back
      </a>
      <h1 class="font-display text-xs font-bold tracking-[0.12em] uppercase">Map</h1>
    </nav>
    <div class="relative min-h-0 flex-1">
      <div ref="container" class="map size-full bg-ink" />
      <!-- Where MapLibre puts its controls. -->
      <MapZoomControl
        class="absolute top-2.5 right-2.5"
        @zoom-in="map?.zoomIn()"
        @zoom-out="map?.zoomOut()"
      />
    </div>
  </div>
</template>

<style scoped>
/* MapLibre's stylesheet isn't in a layer, so it beats Tailwind's utilities. */
.map :deep(.maplibregl-ctrl-attrib) {
  background-color: var(--color-ink);
  color: var(--color-paper);
}
.map :deep(.maplibregl-ctrl-attrib a) {
  color: inherit;
}
</style>
