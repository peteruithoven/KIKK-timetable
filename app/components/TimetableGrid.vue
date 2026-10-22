<script setup lang="ts">
const props = defineProps<{
  date: string;
  timetable: DayTimetable;
  /** Vertical zoom, see useVerticalZoom. */
  zoom?: number;
}>();

const PX_PER_MINUTE = 2;
const pxPerMinute = computed(() => PX_PER_MINUTE * (props.zoom ?? 1));
const TIME_COLUMN = "3.5rem";
const VENUE_COLUMN = "10rem";
const NuxtLink = resolveComponent("NuxtLink");
// What a phone shows before scrolling, for the largest contentful paint: their images load first.
const PRIORITY_COLUMNS = 2;
const PRIORITY_HEIGHT = 800;

const height = computed(() => props.timetable.length * pxPerMinute.value);

const hours = computed(() => {
  const { startMinute, length } = props.timetable;
  return Array.from({ length: length / 60 }, (_, i) => ({
    top: i * 60 * pxPerMinute.value,
    label: `${String((startMinute / 60 + i) % 24).padStart(2, "0")}:00`,
  }));
});

const gridStyle = computed(() => {
  const count = props.timetable.venues.length;
  return {
    gridTemplateColumns: `${TIME_COLUMN} repeat(${count}, minmax(${VENUE_COLUMN}, 1fr))`,
    width: `calc(${TIME_COLUMN} + ${count} * ${VENUE_COLUMN})`,
  };
});

// The width of a venue column, as gridStyle lays it out in the full width timetable scroller.
const columnWidth = computed(
  () => `max(${VENUE_COLUMN}, (100vw - ${TIME_COLUMN}) / ${props.timetable.venues.length})`,
);

// Hour lines, with a fainter line on the half hour.
const columnStyle = computed(() => ({
  height: `${height.value}px`,
  backgroundImage: [
    `repeating-linear-gradient(to bottom, var(--color-line) 0 1px, transparent 1px ${60 * pxPerMinute.value}px)`,
    `repeating-linear-gradient(to bottom, var(--color-line-faint) 0 1px, transparent 1px ${30 * pxPerMinute.value}px)`,
  ].join(", "),
}));

// Favorites as bars at the edge of the screen when their column is scrolled out of view.
// Positioned like their block; sticky keeps them at the edge.
const { isFavorite } = useFavorites();
const favoriteBars = computed(() => {
  const count = props.timetable.venues.length;
  return props.timetable.venues.flatMap((venue, column) =>
    venue.events
      .filter((placed) => isFavorite(placed.event.id))
      .map((placed) => ({
        id: placed.event.id,
        top: `${placed.top * pxPerMinute.value + 1}px`,
        height: `${placed.duration * pxPerMinute.value - 2}px`,
        // Just inside the block's left edge: column border and gap are 3px.
        offset: `calc(${((column + placed.lane / placed.lanes) / count) * 100}% + 4px)`,
      })),
  );
});

// Bars only show while their block is completely out of view. Starts empty, so no bars show
// over their own block before the observer reports.
const grid = useTemplateRef<HTMLElement>("grid");
const outOfView = reactive(new Set<string>());
let observer: IntersectionObserver | undefined;
function observeFavorites() {
  observer?.disconnect();
  outOfView.clear();
  const timeColumn = grid.value?.querySelector<HTMLElement>("[data-timeline]")?.offsetWidth ?? 0;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.favorite!;
        if (entry.isIntersecting) outOfView.delete(id);
        else outOfView.add(id);
      }
    },
    // Blocks behind the sticky time column are out of view too.
    { rootMargin: `0px 0px 0px -${timeColumn}px` },
  );
  grid.value?.querySelectorAll("[data-favorite]").forEach((card) => observer!.observe(card));
}
// Only when other blocks are shown, not on zoom: the observer keeps tracking resized blocks.
const favoriteBlocks = computed(
  () =>
    `${props.date}|${props.timetable.venues.map((v) => v.name)}|${favoriteBars.value.map((b) => b.id)}`,
);
onMounted(() => watch(favoriteBlocks, observeFavorites, { immediate: true, flush: "post" }));
onBeforeUnmount(() => observer?.disconnect());

// Only known on the client, so the server render has no time marker.
const now = ref<number | null>(null);
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  now.value = Date.now();
  timer = setInterval(() => (now.value = Date.now()), 30_000);
});
onBeforeUnmount(() => clearInterval(timer));

const nowTop = computed(() => {
  const { startsAt, length } = props.timetable;
  if (now.value === null || startsAt === null) return null;
  const minutes = (now.value - startsAt) / 60_000;
  return minutes >= 0 && minutes <= length ? minutes * pxPerMinute.value : null;
});
</script>

<template>
  <div ref="grid" class="grid min-w-full" :style="gridStyle">
    <div
      class="sticky top-0 left-0 z-30 flex flex-col items-center justify-center border-b border-ink bg-paper py-2 leading-none"
    >
      <span class="text-[10px] text-ink-muted uppercase">
        {{ formatDay(date, { weekday: "short" }) }}
      </span>
      <span class="font-display text-lg font-bold">{{ formatDay(date, { day: "numeric" }) }}</span>
    </div>
    <!-- Venue names link to the venue on the map. -->
    <component
      :is="venueMapPath(venue.name) ? NuxtLink : 'div'"
      v-for="venue in timetable.venues"
      :key="venue.name"
      :to="venueMapPath(venue.name) ?? undefined"
      class="sticky top-0 z-20 flex flex-col justify-center border-b border-l border-b-ink border-l-line bg-paper px-2 py-2 text-center transition-colors"
      :class="{ 'hover:bg-block': venueMapPath(venue.name) }"
    >
      <span
        v-if="venueParts(venue.name).building"
        class="truncate text-[10px] tracking-[0.12em] text-ink-muted uppercase"
      >
        {{ venueParts(venue.name).building }}
      </span>
      <span class="truncate font-display text-sm font-bold">
        {{ venueParts(venue.name).room }}
      </span>
    </component>

    <!-- Explicit grid positions, so the favorites layer below can overlap the columns. -->
    <div
      data-timeline
      class="sticky left-0 z-10 bg-paper"
      :style="{ height: `${height}px`, gridRow: 2, gridColumn: 1 }"
    >
      <span
        v-for="hour in hours"
        :key="hour.label"
        class="absolute right-2 mt-1 text-xs font-light text-ink-faint tabular-nums"
        :style="{ top: `${hour.top}px` }"
      >
        {{ hour.label }}
      </span>
    </div>
    <div
      v-for="(venue, index) in timetable.venues"
      :key="venue.name"
      class="relative border-l border-line"
      :style="{ ...columnStyle, gridRow: 2, gridColumn: index + 2 }"
    >
      <TimetableEventCard
        v-for="placed in venue.events"
        :key="placed.event.id"
        :event="placed.event"
        :height="placed.duration * pxPerMinute - 2"
        :priority="index < PRIORITY_COLUMNS && placed.top * pxPerMinute < PRIORITY_HEIGHT"
        :width="`(${columnWidth}) / ${placed.lanes} - 4px`"
        :style="{
          top: `${placed.top * pxPerMinute + 1}px`,
          left: `calc(${(placed.lane / placed.lanes) * 100}% + 2px)`,
          width: `calc(${100 / placed.lanes}% - 4px)`,
        }"
      />
      <div
        v-if="nowTop !== null"
        class="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-ink"
        :style="{ top: `${nowTop}px` }"
      />
    </div>
    <div
      v-if="favoriteBars.length"
      class="pointer-events-none relative z-5"
      :style="{ gridRow: 2, gridColumn: '2 / -1' }"
      aria-hidden="true"
    >
      <div
        v-for="bar in favoriteBars"
        :key="bar.id"
        class="absolute inset-x-0 flex"
        :style="{ top: bar.top, height: bar.height }"
      >
        <!-- A spacer rather than a margin: sticky can't move margins out of the container. -->
        <div class="shrink-0" :style="{ width: bar.offset }" />
        <div
          class="sticky right-0 w-1 shrink-0 bg-ink"
          :class="{ invisible: !outOfView.has(bar.id) }"
          :style="{ left: TIME_COLUMN }"
        />
      </div>
    </div>
  </div>
</template>
