<script setup lang="ts">
defineProps<{
  venue: Venue;
  /** Its events in the timetable, null when it has none. */
  eventsPath: string | null;
  /** Its installations on the art trail, null when it has none. */
  trailPath: string | null;
}>();
defineEmits<{ close: [] }>();
</script>

<template>
  <section class="border-t border-line bg-paper px-4 pt-3 pb-4" :aria-label="venue.name">
    <div class="flex items-start justify-between gap-2">
      <h2 class="font-display text-lg leading-tight font-bold tracking-tight uppercase">
        {{ venue.name }}
      </h2>
      <button
        type="button"
        aria-label="Close"
        title="Close"
        class="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center transition-colors hover:bg-block"
        @click="$emit('close')"
      >
        <Icon name="material-symbols:close" class="size-5" aria-hidden="true" />
      </button>
    </div>
    <div class="mt-3 flex flex-wrap gap-2">
      <a
        :href="venueDirectionsUrl(venue)"
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-1.5 clip-corner bg-ink px-3 py-2.5 font-display text-xs font-bold tracking-[0.12em] text-paper uppercase transition-colors hover:bg-ink-soft"
      >
        <Icon name="material-symbols:directions" class="size-4" aria-hidden="true" />
        Directions
      </a>
      <NuxtLink
        v-if="eventsPath"
        :to="eventsPath"
        class="inline-flex items-center gap-1.5 bevel-corner border border-ink px-3 py-2.5 font-display text-xs font-bold tracking-[0.12em] uppercase transition-colors hover:bg-ink hover:text-paper"
      >
        <Icon name="material-symbols:calendar-month-outline" class="size-4" aria-hidden="true" />
        Events
      </NuxtLink>
      <NuxtLink
        v-if="trailPath"
        :to="trailPath"
        class="inline-flex items-center gap-1.5 bevel-corner border border-ink px-3 py-2.5 font-display text-xs font-bold tracking-[0.12em] uppercase transition-colors hover:bg-ink hover:text-paper"
      >
        <Icon name="material-symbols:palette-outline" class="size-4" aria-hidden="true" />
        Art trail
      </NuxtLink>
    </div>
  </section>
</template>
