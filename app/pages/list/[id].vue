<script setup lang="ts">
const route = useRoute();
const id = String(route.params.id);

const { data: list, error } = await useFetch<FavoritesList>(`/api/lists/${id}`);
if (!list.value) {
  throw createError({
    status: error.value?.status ?? 404,
    statusText: "List not found",
    fatal: true,
  });
}
const [{ data: schedule }, { data: trail }] = await Promise.all([useSchedule(), useTrail()]);
const favorites = useFavorites();

const isOwn = computed(() => favorites.listId.value === id);
// This device's latest state for its own list, including unsaved changes.
const favoriteIds = computed(
  () => new Set(isOwn.value ? favorites.events.value : list.value?.events),
);

const days = computed(() => {
  const byDay = new Map<string, TimetableEvent[]>();
  for (const event of schedule.value?.events ?? []) {
    if (favoriteIds.value.has(event.id))
      byDay.set(event.date, [...(byDay.get(event.date) ?? []), event]);
  }
  return [...byDay]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, events]) => ({
      date,
      events: events.sort((a, b) => (a.start ?? "").localeCompare(b.start ?? "")),
    }));
});

const installations = computed(
  () => trail.value?.installations.filter((item) => favoriteIds.value.has(item.id)) ?? [],
);

// Behind the reverse proxy the app itself is reached over plain http.
const origin = useRequestURL({ xForwardedHost: true, xForwardedProto: true }).origin;
const shareUrl = `${origin}${listPath(id)}`;
// Calendar apps subscribe to this and check it for changes regularly.
const calendarUrl = `${origin}/api/lists/${id}/calendar.ics`;
const webcalUrl = calendarUrl.replace(/^https?:/, "webcal:");
const googleCalendarUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;

const adopting = ref(false);
async function adopt() {
  adopting.value = true;
  try {
    await favorites.adopt(id);
    await navigateTo("/");
  } finally {
    adopting.value = false;
  }
}

useSeoMeta({ title: "Favorites · KIKK 2026" });
</script>

<template>
  <div class="min-h-dvh">
    <nav class="border-b border-line px-4 py-3">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 bevel-corner border border-line px-3 py-1.5 font-display text-xs font-semibold tracking-[0.12em] uppercase transition-colors hover:border-ink"
      >
        <Icon name="material-symbols:arrow-left-alt" class="size-4" aria-hidden="true" /> Timetable
      </NuxtLink>
    </nav>

    <main class="mx-auto max-w-3xl px-4 pt-6 pb-16">
      <p class="font-display text-[11px] font-semibold tracking-[0.3em] text-neutral-500 uppercase">
        Favorites
      </p>
      <h1 class="mt-1 font-display text-3xl font-extrabold tracking-tight break-all sm:text-5xl">
        {{ id }}
      </h1>

      <section v-if="isOwn" class="mt-6 border-y border-line py-5">
        <p class="max-w-prose text-sm text-neutral-700">
          This is your list. Open this link on another device to see and change the same favorites,
          or share it with friends to plan together. Anyone with the link can change the list.
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <input
            :value="shareUrl"
            readonly
            aria-label="Link to this list"
            class="min-w-0 flex-1 basis-60 border border-line px-3 py-2 text-sm"
            @focus="($event.target as HTMLInputElement).select()"
          />
          <ShareButton :url="shareUrl" title="My KIKK 2026 favorites" />
          <CopyButton :value="shareUrl" />
        </div>
      </section>

      <section v-else class="mt-6 border-y border-line py-5">
        <p class="max-w-prose text-sm text-neutral-700">
          Someone shared these favorites with you. Use this list on this device to see them in the
          timetable and change them together.
        </p>
        <button
          type="button"
          :disabled="adopting"
          class="mt-4 clip-corner bg-ink px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] text-paper uppercase transition-colors hover:bg-neutral-700 disabled:opacity-60"
          @click="adopt"
        >
          Use this list on this device
        </button>
        <p v-if="favorites.listId.value" class="mt-3 text-xs text-neutral-500">
          Your current list ({{ favorites.events.value.length }} favorites) stays available at
          <NuxtLink :to="listPath(favorites.listId.value)" class="underline">
            {{ listPath(favorites.listId.value) }}</NuxtLink
          >.
        </p>
      </section>

      <section class="border-b border-line py-5">
        <h2 class="font-display text-lg font-bold">Add to your calendar</h2>
        <p class="mt-1 max-w-prose text-sm text-neutral-700">
          Subscribe to {{ isOwn ? "your" : "these" }} favorites in your calendar app. It stays up to
          date: new favorites and schedule changes show up by themselves. Calendar apps check for
          changes every few hours, Google Calendar can take up to a day.
          <template v-if="installations.length">
            Art trail works aren't included, they have no set times.
          </template>
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <a
            :href="webcalUrl"
            class="inline-flex items-center gap-1.5 clip-corner bg-ink px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] text-paper uppercase transition-colors hover:bg-neutral-700"
          >
            <Icon name="material-symbols:calendar-add-on" class="size-4" aria-hidden="true" />
            Subscribe
          </a>
          <a
            :href="googleCalendarUrl"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1.5 bevel-corner border border-ink px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] uppercase transition-colors hover:bg-ink hover:text-paper"
          >
            Google Calendar
            <Icon name="material-symbols:arrow-outward" class="size-4" aria-hidden="true" />
          </a>
          <CopyButton :value="calendarUrl" label="Copy calendar link" />
        </div>
      </section>

      <p v-if="days.length === 0 && installations.length === 0" class="mt-8 text-neutral-500">
        No favorites yet. Open an event in the timetable or a work on the art trail and add it to
        your favorites.
      </p>
      <section v-for="day in days" :key="day.date" class="mt-8">
        <h2 class="font-display text-lg font-bold">
          {{ formatDay(day.date, { weekday: "long", day: "numeric", month: "long" }) }}
        </h2>
        <ul class="mt-2 border-t border-ink">
          <li v-for="event in day.events" :key="event.id" class="border-b border-line">
            <NuxtLink
              :to="eventPath(event)"
              class="flex gap-4 py-3 transition-colors hover:bg-block"
            >
              <span class="w-12 shrink-0 text-sm text-neutral-500 tabular-nums">
                {{ event.start }}
              </span>
              <span class="min-w-0">
                <span class="block font-display leading-tight font-semibold">
                  {{ event.title }}
                </span>
                <span v-if="event.venue" class="mt-0.5 block text-xs text-neutral-500">
                  {{ event.venue }}
                </span>
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>
      <section v-if="installations.length" class="mt-8">
        <h2 class="font-display text-lg font-bold">Art trail</h2>
        <ul class="mt-2 border-t border-ink">
          <li v-for="item in installations" :key="item.id" class="border-b border-line">
            <NuxtLink
              :to="installationPath(item)"
              class="flex items-center gap-4 py-3 transition-colors hover:bg-block"
            >
              <img
                v-if="item.image"
                :src="resizedImage(item.image, 96)"
                crossorigin="anonymous"
                alt=""
                loading="lazy"
                class="size-12 shrink-0 bg-block object-cover"
              />
              <span v-else class="size-12 shrink-0 bg-block" />
              <span class="min-w-0">
                <span class="block font-display leading-tight font-semibold">
                  {{ item.title }}
                </span>
                <span class="mt-0.5 block text-xs text-neutral-500">
                  {{ [item.artist, item.venue].filter(Boolean).join(" · ") }}
                </span>
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>
