<script setup lang="ts">
const route = useRoute();
const { data, error } = await useSchedule();

const days = computed(() => [...new Set(data.value?.events.map((event) => event.date))].sort());

const selectedDay = computed(() => {
  const requested = route.query.day;
  if (typeof requested === "string" && days.value.includes(requested)) return requested;
  const today = festivalToday();
  return days.value.includes(today) ? today : days.value[0];
});

const router = useRouter();

const selectedVenue = computed<VenueFilter | "all">({
  get() {
    const requested = route.query.venue;
    return VENUE_FILTERS.find((venue) => venue.key === requested)?.key ?? "all";
  },
  set(venue) {
    const { venue: _, ...query } = route.query;
    router.replace({ query: venue === "all" ? query : { ...query, venue } });
  },
});

const timetable = computed(() =>
  buildDayTimetable(
    data.value?.events.filter(
      (event) =>
        event.date === selectedDay.value &&
        (selectedVenue.value === "all" || isInBuilding(event, selectedVenue.value)),
    ) ?? [],
  ),
);

const selectedBuilding = computed(
  () => VENUE_FILTERS.find((venue) => venue.key === selectedVenue.value)?.building,
);

// Restore the scroll position when coming back from an event page.
const scroller = useTemplateRef<HTMLElement>("scroller");
const savedScroll = useState<{ key: string; top: number; left: number } | null>(
  "timetable-scroll",
  () => null,
);
const scrollKey = computed(() => `${selectedDay.value}|${selectedVenue.value}`);
onBeforeUnmount(() => {
  if (!scroller.value) return;
  const { scrollTop: top, scrollLeft: left } = scroller.value;
  savedScroll.value = { key: scrollKey.value, top, left };
});
onMounted(() => {
  const saved = savedScroll.value;
  if (saved?.key === scrollKey.value) scroller.value?.scrollTo(saved.left, saved.top);
});

const updatedAt = computed(() =>
  data.value
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Brussels",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(data.value.updatedAt))
    : null,
);

useHead({ title: "KIKK 2026 Timetable" });
</script>

<template>
  <div class="flex h-dvh flex-col">
    <header class="shrink-0 border-b border-line bg-paper px-4 pt-4 pb-3">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p
            class="font-display text-[11px] font-semibold tracking-[0.3em] text-neutral-500 uppercase"
          >
            KIKK Festival 2026
          </p>
          <h1 class="font-display text-3xl leading-none font-extrabold tracking-tight uppercase">
            Timetable
          </h1>
          <p v-if="data?.stale" class="mt-1 text-xs text-neutral-500">
            Offline · as of {{ updatedAt }}
          </p>
        </div>
        <label class="relative shrink-0">
          <span class="sr-only">Venue</span>
          <select
            v-model="selectedVenue"
            class="appearance-none border py-2 pr-8 pl-3 font-display text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
            :class="
              selectedVenue === 'all'
                ? 'border-line bg-paper text-ink hover:border-ink'
                : 'clip-corner border-ink bg-ink text-paper'
            "
          >
            <option value="all">All venues</option>
            <option v-for="venue in VENUE_FILTERS" :key="venue.key" :value="venue.key">
              {{ venue.building }}
            </option>
          </select>
          <svg
            class="pointer-events-none absolute top-1/2 right-3 size-3 -translate-y-1/2"
            :class="selectedVenue === 'all' ? 'text-ink' : 'text-paper'"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <path d="M2 4l4 4 4-4" />
          </svg>
        </label>
      </div>
      <nav aria-label="Days" class="mt-3 flex gap-2 overflow-x-auto">
        <NuxtLink
          v-for="day in days"
          :key="day"
          :to="{ query: { ...route.query, day } }"
          replace
          :aria-current="day === selectedDay ? 'date' : undefined"
          class="flex w-14 shrink-0 flex-col items-center border border-line py-1.5 transition-colors hover:border-ink aria-[current]:clip-corner aria-[current]:border-ink aria-[current]:bg-ink aria-[current]:text-paper"
        >
          <span class="text-[11px] uppercase">{{ formatDay(day, { weekday: "short" }) }}</span>
          <span class="font-display text-xl leading-none font-bold">
            {{ formatDay(day, { day: "numeric" }) }}
          </span>
        </NuxtLink>
      </nav>
    </header>

    <main ref="scroller" class="min-h-0 flex-1 overflow-auto overscroll-contain">
      <p v-if="error && !data" class="p-4 text-neutral-500">
        The schedule couldn't be loaded. Please try again later.
      </p>
      <p v-else-if="selectedDay && timetable.venues.length === 0" class="p-4 text-neutral-500">
        Nothing at {{ selectedBuilding }} on
        {{ formatDay(selectedDay, { weekday: "long", day: "numeric", month: "long" }) }}.
      </p>
      <TimetableGrid v-else-if="selectedDay" :date="selectedDay" :timetable="timetable" />
    </main>
  </div>
</template>
