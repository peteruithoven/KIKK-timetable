<script setup lang="ts">
const { data, error } = await useTrail();

const search = useSearchQuery("trail_searched", () => matches.value.length);
const searchOpen = ref(search.value !== "");
const searchText = useSearchText(search);
const matches = computed(
  () =>
    data.value?.installations.filter((item) =>
      matchesSearch(
        search.value,
        item.title,
        item.artist,
        item.venue,
        item.medium,
        searchText.value[item.id] ?? null,
      ),
    ) ?? [],
);
// Places without matching works are left out.
const groups = computed(() => groupByVenue(matches.value));

useSeoMeta({
  title: "Art Trail · KIKK 2026",
  description: "Digital and interactive art installations across Namur during KIKK Festival 2026.",
});
</script>

<template>
  <div class="min-h-dvh">
    <nav
      class="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-line bg-paper px-4 py-3"
    >
      <!-- Icons only on phones while searching, to make room. -->
      <NuxtLink
        to="/"
        class="inline-flex shrink-0 items-center gap-2 bevel-corner border border-line px-3 py-2 font-display text-xs font-semibold tracking-[0.12em] uppercase transition-colors hover:border-ink"
        :class="{ 'max-sm:px-2': searchOpen }"
      >
        <Icon name="material-symbols:arrow-left-alt" class="size-4" aria-hidden="true" />
        <span :class="{ 'max-sm:sr-only': searchOpen }">Timetable</span>
      </NuxtLink>
      <div class="flex min-w-0 flex-1 justify-end gap-2">
        <SearchToggle
          v-model="search"
          v-model:open="searchOpen"
          placeholder="Title, artist, place"
        />
        <NuxtLink
          to="/map"
          class="inline-flex shrink-0 items-center gap-2 bevel-corner border border-line px-3 py-2 font-display text-xs font-semibold tracking-[0.12em] uppercase transition-colors hover:border-ink"
          :class="{ 'max-sm:px-2': searchOpen }"
        >
          <Icon name="material-symbols:map-outline" class="size-4" aria-hidden="true" />
          <span :class="{ 'max-sm:sr-only': searchOpen }">Map</span>
        </NuxtLink>
      </div>
    </nav>

    <main class="mx-auto max-w-5xl px-4 pt-6 pb-16">
      <p class="font-display text-[11px] font-semibold tracking-[0.3em] text-ink-muted uppercase">
        KIKK Festival 2026
      </p>
      <h1
        class="mt-1 font-display text-4xl leading-none font-extrabold tracking-tight uppercase sm:text-6xl"
      >
        Art Trail
      </h1>
      <!-- As announced on kikkfestival.be/public/art-trail. -->
      <p class="mt-3 max-w-prose text-ink-soft">
        Interactive and immersive installations across Namur. 22–25 October, 10:00–18:00.
      </p>

      <p v-if="error && !data" class="mt-8 text-ink-muted">
        The art trail couldn't be loaded. Please try again later.
      </p>
      <p v-else-if="data && groups.length === 0" class="mt-8 text-ink-muted">
        Nothing matching “{{ search.trim() }}”.
      </p>
      <!-- Anchors for the map's links, clear of the sticky nav. -->
      <section
        v-for="group in groups"
        :id="group.key ?? undefined"
        :key="group.name"
        class="mt-10 scroll-mt-20"
      >
        <div class="flex items-baseline justify-between gap-4 border-b border-ink pb-2">
          <h2 class="font-display text-lg leading-tight font-bold tracking-tight uppercase">
            {{ group.name }}
          </h2>
          <NuxtLink
            v-if="group.mapPath"
            :to="group.mapPath"
            class="inline-flex shrink-0 items-center gap-1 font-display text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase transition-colors hover:text-ink"
          >
            <Icon name="material-symbols:location-on-outline" class="size-4" aria-hidden="true" />
            Map
          </NuxtLink>
        </div>
        <ul class="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          <li v-for="item in group.items" :key="item.id">
            <TrailCard :item="item" />
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>
