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
const selectedVenue = computed(() => VENUES.find((venue) => venue.key === highlightedVenue.value));

// For the links in the venue bar.
const [{ data: schedule }, { data: trail }] = await Promise.all([useSchedule(), useTrail()]);

const eventsPath = computed(() => {
  const key = selectedVenue.value?.key;
  const dates = schedule.value?.events
    .filter((event) => findVenue(event.venue)?.key === key)
    .map((event) => event.date)
    .sort();
  if (!key || !dates?.length) return null;
  // The timetable opens on today during the festival, otherwise pick the venue's first day.
  return dates.includes(festivalToday()) ? `/?venue=${key}` : `/?venue=${key}&day=${dates[0]}`;
});

const trailPath = computed(() => {
  const key = selectedVenue.value?.key;
  const hasInstallations = trail.value?.installations.some(
    (installation) => findVenue(installation.venue)?.key === key,
  );
  return key && hasInstallations ? `/trail#${key}` : null;
});

function selectVenue(key: string | null) {
  // Replace, so Back still goes back to where the map was opened from.
  const { venue: _, ...query } = route.query;
  router.replace({ query: key ? { ...query, venue: key } : query });
}

const container = useTemplateRef<HTMLDivElement>("container");
let map: MapLibreMap | undefined;
let styleLoaded = false;

onMounted(async () => {
  // MapLibre needs WebGL and the DOM, and it's big, so it's only loaded on this page.
  const { Map, LngLatBounds, setWorkerUrl } = await import("maplibre-gl");
  if (!container.value) return;
  setWorkerUrl(workerUrl);
  const bounds = new LngLatBounds();
  for (const venue of VENUES) bounds.extend(venue.coordinates);
  const instance = new Map({
    container: container.value,
    bounds,
    fitBoundsOptions: { padding: 48 },
    // The full text instead of an info button.
    attributionControl: { compact: false },
    // North up and flat: no rotating or tilting, by mouse, touch or keyboard.
    dragRotate: false,
    touchPitch: false,
    maxPitch: 0,
  });
  instance.touchZoomRotate.disableRotation();
  instance.keyboard.disableRotation();
  instance.setStyle("https://tiles.openfreemap.org/styles/dark", {
    // Runs when the style has been fetched, so it picks up a highlight changed in the meantime.
    transformStyle: (_, style) => withVenueLayers(withStyleTweaks(style), highlightedVenue.value),
  });
  addPinImage(instance);
  instance.once("style.load", () => {
    onVenueClick(instance, selectVenue);
    styleLoaded = true;
  });
  map = instance;
});

watch(highlightedVenue, (key) => {
  if (map && styleLoaded) highlightVenue(map, key);
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
    <MapVenueBar
      v-if="selectedVenue"
      :venue="selectedVenue"
      :events-path="eventsPath"
      :trail-path="trailPath"
      @close="selectVenue(null)"
    />
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
