<script setup lang="ts">
const route = useRoute();
const router = useRouter();

const [{ data: installation, error }, { data: trail }] = await Promise.all([
  useFetch<Installation>(() => `/api/trail/${route.params.slug}`),
  useTrail(),
]);
if (!installation.value) {
  throw createError({
    status: error.value?.status ?? 404,
    statusText: "Installation not found",
    fatal: true,
  });
}

const place = computed(() => findVenue(installation.value?.venue ?? null));
const venue = computed(() => {
  const name = place.value?.name ?? installation.value?.venue;
  return name ? { name, mapPath: place.value ? venueMapPath(place.value.name) : null } : null;
});

// The other works at the same place, for those walking the trail.
const sameVenue = computed(() =>
  place.value
    ? (trail.value?.installations.filter(
        (item) => item.id !== installation.value?.id && findVenue(item.venue) === place.value,
      ) ?? [])
    : [],
);

const intro = computed(() => localize(installation.value?.intro));
const description = computed(() => localize(installation.value?.description));

const links = computed(() =>
  [
    { label: "Website", url: installation.value?.websiteUrl },
    { label: "Instagram", url: installation.value?.instagramUrl },
    { label: "Facebook", url: installation.value?.facebookUrl },
  ].filter((link): link is { label: string; url: string } => Boolean(link.url)),
);

// Back to the art trail as it was when we came from there.
function goBack(clickEvent: MouseEvent) {
  if (window.history.state?.back) {
    clickEvent.preventDefault();
    router.back();
  }
}

useSeoMeta({
  title: () => `${installation.value?.title} · KIKK 2026`,
  ogTitle: () => installation.value?.title,
  description: () => plainText(intro.value?.text ?? description.value?.text),
  ...ogImageMeta(() => installation.value?.heroImage),
});
</script>

<template>
  <div v-if="installation" class="min-h-dvh">
    <nav
      class="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-line bg-paper px-4 py-3"
    >
      <a
        href="/trail"
        class="inline-flex items-center gap-2 bevel-corner border border-line px-3 py-1.5 font-display text-xs font-semibold tracking-[0.12em] uppercase transition-colors hover:border-ink"
        @click="goBack"
      >
        <Icon name="material-symbols:arrow-left-alt" class="size-4" aria-hidden="true" /> Art trail
      </a>
      <FavoriteButton :id="installation.id" />
    </nav>

    <img
      v-if="installation.heroImage"
      :src="resizedImage(installation.heroImage, 1600)"
      crossorigin="anonymous"
      alt=""
      class="aspect-video max-h-[70vh] w-full bg-ink object-cover"
    />

    <article class="mx-auto max-w-5xl px-4 pt-6 pb-16">
      <div class="flex flex-wrap gap-2">
        <span
          class="clip-corner bg-ink px-2.5 py-1 font-display text-[11px] font-bold tracking-[0.12em] text-paper uppercase"
        >
          Installation
        </span>
        <span
          v-for="tag in installation.tags"
          :key="tag"
          class="border border-line px-2.5 py-1 font-display text-[11px] font-semibold tracking-[0.12em] text-neutral-600 uppercase"
        >
          {{ tag }}
        </span>
      </div>

      <h1
        class="mt-4 font-display text-4xl leading-[0.95] font-extrabold tracking-tight text-balance wrap-break-word hyphens-auto uppercase sm:text-6xl"
      >
        {{ installation.title }}
      </h1>
      <p v-if="installation.artist" class="mt-3 font-display text-xl font-semibold">
        {{ installation.artist.name }}
      </p>

      <dl
        v-if="venue || installation.year || installation.medium"
        class="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-5 sm:grid-cols-4"
      >
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
        <div v-if="installation.year">
          <dt class="text-[11px] tracking-[0.12em] text-neutral-500 uppercase">Year</dt>
          <dd class="mt-1 font-display font-bold">{{ installation.year }}</dd>
        </div>
        <div v-if="installation.medium" class="col-span-2">
          <dt class="text-[11px] tracking-[0.12em] text-neutral-500 uppercase">Medium</dt>
          <dd class="mt-1 font-display font-bold">{{ installation.medium }}</dd>
        </div>
      </dl>

      <div class="mt-5 mb-4 flex flex-wrap gap-2">
        <a
          :href="installation.url"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1.5 clip-corner bg-ink px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] text-paper uppercase transition-colors hover:bg-neutral-700"
        >
          More on kikkfestival.be
          <Icon name="material-symbols:arrow-outward" class="size-4" aria-hidden="true" />
        </a>
        <a
          v-for="link in links"
          :key="link.label"
          :href="link.url"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1.5 bevel-corner border border-ink px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] uppercase transition-colors hover:bg-ink hover:text-paper"
        >
          {{ link.label }}
          <Icon name="material-symbols:arrow-outward" class="size-4" aria-hidden="true" />
        </a>
      </div>

      <!-- Intro, description and bio are sanitized on the server, see server/utils/kikk-mapping.ts -->
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
      <EventSection v-if="installation.gallery.length" label="Gallery">
        <ul
          class="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 sm:mx-0 sm:scroll-px-0 sm:px-0"
        >
          <li v-for="url in installation.gallery" :key="url" class="shrink-0 snap-start">
            <a :href="url" target="_blank" rel="noopener" class="block">
              <img
                :src="resizedImage(url, 640)"
                crossorigin="anonymous"
                alt=""
                loading="lazy"
                decoding="async"
                class="h-48 w-64 bg-block object-cover sm:h-60 sm:w-80"
              />
            </a>
          </li>
        </ul>
        <p v-if="installation.credit" class="mt-2 text-xs text-neutral-500">
          Photos: {{ installation.credit }}
        </p>
      </EventSection>
      <EventSection
        v-if="installation.artist && (installation.artist.bio || installation.artist.photo)"
        label="Artist"
      >
        <EventPerson :person="installation.artist" />
      </EventSection>
      <EventSection v-if="sameVenue.length" :label="`Also at ${venue?.name}`">
        <ul class="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
          <li v-for="item in sameVenue" :key="item.id">
            <TrailCard :item="item" />
          </li>
        </ul>
      </EventSection>
    </article>
  </div>
</template>
