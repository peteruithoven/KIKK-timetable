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
    <header class="shrink-0 border-b border-zinc-800 bg-zinc-900">
      <div class="flex items-center justify-between gap-4 px-4 pt-3">
        <div class="min-w-0">
          <h1 class="text-lg font-bold tracking-tight">KIKK 2026 Timetable</h1>
          <p v-if="data?.stale" class="text-xs text-zinc-400">Offline · as of {{ updatedAt }}</p>
        </div>
        <label class="shrink-0">
          <span class="sr-only">Venue</span>
          <select
            v-model="selectedVenue"
            class="rounded-full border bg-zinc-900 py-1.5 pr-2 pl-3 text-sm font-semibold transition-colors"
            :class="
              selectedVenue === 'all' ? 'border-zinc-700 hover:border-zinc-500' : 'border-accent'
            "
          >
            <option value="all">All venues</option>
            <option v-for="venue in VENUE_FILTERS" :key="venue.key" :value="venue.key">
              {{ venue.building }}
            </option>
          </select>
        </label>
      </div>
      <nav aria-label="Days" class="flex gap-2 overflow-x-auto px-4 py-3">
        <NuxtLink
          v-for="day in days"
          :key="day"
          :to="{ query: { ...route.query, day } }"
          replace
          :aria-current="day === selectedDay ? 'date' : undefined"
          class="shrink-0 rounded-full border border-zinc-700 px-4 py-1.5 text-sm font-semibold transition-colors hover:border-zinc-500 aria-[current]:border-accent aria-[current]:bg-accent aria-[current]:text-zinc-950"
        >
          {{ formatDay(day, { weekday: "short", day: "numeric", month: "short" }) }}
        </NuxtLink>
      </nav>
    </header>

    <main class="min-h-0 flex-1 overflow-auto overscroll-contain">
      <p v-if="error && !data" class="p-4 text-zinc-400">
        The schedule couldn't be loaded. Please try again later.
      </p>
      <p v-else-if="selectedDay && timetable.venues.length === 0" class="p-4 text-zinc-400">
        Nothing at {{ selectedBuilding }} on
        {{ formatDay(selectedDay, { weekday: "long", day: "numeric", month: "long" }) }}.
      </p>
      <TimetableGrid v-else-if="selectedDay" :date="selectedDay" :timetable="timetable" />
    </main>
  </div>
</template>
