<script setup lang="ts">
const route = useRoute();
const router = useRouter();

const { data: event, error } = await useFetch<FestivalEvent>(
  () => `/api/events/${route.params.kind}/${route.params.slug}`,
);
if (!event.value) {
  throw createError({
    status: error.value?.status ?? 404,
    statusText: "Event not found",
    fatal: true,
  });
}

const favorites = useFavorites();
const favorite = computed(() => favorites.isFavorite(event.value!.id));

const venue = computed(() => {
  if (!event.value?.venue) return null;
  const { building, room } = venueParts(event.value.venue);
  const mapPath = venueMapPath(event.value.venue);
  return building ? { name: building, room, mapPath } : { name: room, room: null, mapPath };
});

const time = computed(() => [event.value?.start, event.value?.end].filter(Boolean).join(" – "));

const intro = computed(() => localize(event.value?.intro));
const description = computed(() => localize(event.value?.description));

const speakersLabel = computed(() => {
  if (event.value?.kind === "panel") return "Speakers";
  return event.value?.speakers.length === 1 ? "Speaker" : "Speakers";
});

// Talks are known by their speaker, so show them with the title.
const byline = computed(() => {
  const speaker = event.value?.kind === "talk" ? event.value.speakers[0] : undefined;
  return speaker ? [speaker.name, speaker.company].filter(Boolean).join(" — ") : null;
});

// Back to the timetable as it was (day, venue filter, scroll) when we came from there.
const timetableHref = computed(() => `/?day=${event.value?.date}`);
function goBack(clickEvent: MouseEvent) {
  if (window.history.state?.back) {
    clickEvent.preventDefault();
    router.back();
  }
}

useSeoMeta({
  title: () => `${event.value?.title} · KIKK 2026`,
  ogTitle: () => event.value?.title,
  description: () => plainText(intro.value?.text ?? description.value?.text),
  ogImage: () => (event.value?.image ? resizedImage(event.value.image, 1200) : undefined),
});
</script>

<template>
  <div v-if="event" class="min-h-dvh">
    <nav
      class="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-line bg-paper px-4 py-3"
    >
      <a
        :href="timetableHref"
        class="inline-flex items-center gap-2 bevel-corner border border-line px-3 py-1.5 font-display text-xs font-semibold tracking-[0.12em] uppercase transition-colors hover:border-ink"
        @click="goBack"
      >
        <Icon name="material-symbols:arrow-left-alt" class="size-4" aria-hidden="true" /> Timetable
      </a>
      <button
        type="button"
        :aria-pressed="favorite"
        class="inline-flex items-center gap-2 bevel-corner border border-ink px-3 py-1.5 font-display text-xs font-bold tracking-[0.12em] uppercase transition-colors"
        :class="
          favorite
            ? 'clip-corner bg-ink text-paper hover:bg-neutral-700'
            : 'hover:bg-ink hover:text-paper'
        "
        @click="favorites.toggle(event.id)"
      >
        <Icon
          :name="favorite ? 'material-symbols:star' : 'material-symbols:star-outline'"
          class="size-5"
          aria-hidden="true"
        />
        {{ favorite ? "Favorite" : "Add to favorites" }}
      </button>
    </nav>

    <img
      v-if="event.image"
      :src="resizedImage(event.image, 1600)"
      crossorigin="anonymous"
      alt=""
      class="aspect-video max-h-[70vh] w-full bg-ink object-cover"
    />

    <article class="mx-auto max-w-5xl px-4 pt-6 pb-16">
      <div class="flex flex-wrap gap-2">
        <span
          class="clip-corner bg-ink px-2.5 py-1 font-display text-[11px] font-bold tracking-[0.12em] text-paper uppercase"
        >
          {{ KIND_LABELS[event.kind] }}
        </span>
        <span
          v-if="event.track"
          class="border border-ink px-2.5 py-1 font-display text-[11px] font-semibold tracking-[0.12em] uppercase"
        >
          {{ event.track }}
        </span>
        <span
          v-for="tag in event.tags"
          :key="tag"
          class="border border-line px-2.5 py-1 font-display text-[11px] font-semibold tracking-[0.12em] text-neutral-600 uppercase"
        >
          {{ tag }}
        </span>
      </div>

      <h1
        class="mt-4 font-display text-4xl leading-[0.95] font-extrabold tracking-tight text-balance wrap-break-word hyphens-auto uppercase sm:text-6xl"
      >
        {{ event.title }}
      </h1>
      <p v-if="byline" class="mt-3 font-display text-xl font-semibold">{{ byline }}</p>

      <dl class="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-5 sm:grid-cols-4">
        <div>
          <dt class="text-[11px] tracking-[0.12em] text-neutral-500 uppercase">Date</dt>
          <dd class="mt-1 font-display font-bold">
            {{ formatDay(event.date, { weekday: "long", day: "numeric", month: "long" }) }}
          </dd>
        </div>
        <div v-if="time">
          <dt class="text-[11px] tracking-[0.12em] text-neutral-500 uppercase">Time</dt>
          <dd class="mt-1 font-display font-bold tabular-nums">{{ time }}</dd>
        </div>
        <div v-if="venue">
          <dt class="text-[11px] tracking-[0.12em] text-neutral-500 uppercase">Venue</dt>
          <dd class="mt-1 font-display font-bold">
            <NuxtLink
              v-if="venue.mapPath"
              :to="venue.mapPath"
              class="underline decoration-line underline-offset-4 transition-colors hover:decoration-ink"
            >
              {{ venue.name }}
            </NuxtLink>
            <template v-else>{{ venue.name }}</template>
          </dd>
        </div>
        <div v-if="venue?.room">
          <dt class="text-[11px] tracking-[0.12em] text-neutral-500 uppercase">Room</dt>
          <dd class="mt-1 font-display font-bold">{{ venue.room }}</dd>
        </div>
      </dl>

      <div class="mt-5 mb-4 flex flex-wrap gap-2">
        <a
          :href="event.url"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1.5 clip-corner bg-ink px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] text-paper uppercase transition-colors hover:bg-neutral-700"
        >
          More on kikkfestival.be
          <Icon name="material-symbols:arrow-outward" class="size-4" aria-hidden="true" />
        </a>
        <a
          v-if="event.ticketUrl"
          :href="event.ticketUrl"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1.5 bevel-corner border border-ink px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] uppercase transition-colors hover:bg-ink hover:text-paper"
        >
          Tickets <Icon name="material-symbols:arrow-outward" class="size-4" aria-hidden="true" />
        </a>
      </div>

      <!-- Intro, description and bios are sanitized on the server, see server/utils/kikk-mapping.ts -->
      <EventSection v-if="intro" label="Intro">
        <div
          class="rich-text max-w-prose text-lg leading-relaxed"
          :lang="intro.lang"
          v-html="intro.text"
        />
      </EventSection>
      <EventSection v-if="description" label="About">
        <div
          class="rich-text max-w-prose leading-relaxed text-neutral-700"
          :lang="description.lang"
          v-html="description.text"
        />
      </EventSection>
      <EventSection v-if="event.speakers.length" :label="speakersLabel">
        <div class="flex flex-col gap-8">
          <EventPerson v-for="person in event.speakers" :key="person.name" :person="person" />
        </div>
      </EventSection>
      <EventSection v-if="event.moderator" label="Moderator">
        <EventPerson :person="event.moderator" />
      </EventSection>
    </article>
  </div>
</template>
