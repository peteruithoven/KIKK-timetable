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

// Hour lines, with a fainter line on the half hour.
const columnStyle = computed(() => ({
  height: `${height.value}px`,
  backgroundImage: [
    `repeating-linear-gradient(to bottom, var(--color-line) 0 1px, transparent 1px ${60 * pxPerMinute.value}px)`,
    `repeating-linear-gradient(to bottom, var(--color-line-faint) 0 1px, transparent 1px ${30 * pxPerMinute.value}px)`,
  ].join(", "),
}));

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
  <div class="grid min-w-full" :style="gridStyle">
    <div
      class="sticky top-0 left-0 z-30 flex flex-col items-center justify-center border-b border-ink bg-paper py-2 leading-none"
    >
      <span class="text-[10px] text-neutral-500 uppercase">
        {{ formatDay(date, { weekday: "short" }) }}
      </span>
      <span class="font-display text-lg font-bold">{{ formatDay(date, { day: "numeric" }) }}</span>
    </div>
    <div
      v-for="venue in timetable.venues"
      :key="venue.name"
      class="sticky top-0 z-20 flex flex-col justify-center border-b border-l border-b-ink border-l-line bg-paper px-2 py-2 text-center"
    >
      <span
        v-if="venueParts(venue.name).building"
        class="truncate text-[10px] tracking-[0.12em] text-neutral-500 uppercase"
      >
        {{ venueParts(venue.name).building }}
      </span>
      <span class="truncate font-display text-sm font-bold">
        {{ venueParts(venue.name).room }}
      </span>
    </div>

    <div data-timeline class="sticky left-0 z-10 bg-paper" :style="{ height: `${height}px` }">
      <span
        v-for="hour in hours"
        :key="hour.label"
        class="absolute right-2 mt-1 text-xs font-light text-neutral-400 tabular-nums"
        :style="{ top: `${hour.top}px` }"
      >
        {{ hour.label }}
      </span>
    </div>
    <div
      v-for="venue in timetable.venues"
      :key="venue.name"
      class="relative border-l border-line"
      :style="columnStyle"
    >
      <TimetableEventCard
        v-for="placed in venue.events"
        :key="placed.event.id"
        :event="placed.event"
        :height="placed.duration * pxPerMinute - 2"
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
  </div>
</template>
