<script setup lang="ts">
const props = defineProps<{ images: string[]; credit?: string | null }>();

// The photo shown full screen, as `?photo=2` (counting from 1), so Back closes it and it can be
// linked to.
const route = useRoute();
const router = useRouter();
const openIndex = computed(() => {
  const number = Number(route.query.photo);
  return Number.isInteger(number) && number >= 1 && number <= props.images.length
    ? number - 1
    : null;
});

function photoLink(index: number) {
  return { query: { ...route.query, photo: index + 1 } };
}

// Swiping to another photo replaces this one in the history, so Back still closes the viewer.
function showPhoto(index: number) {
  router.replace(photoLink(index));
}

// Back to the page when the photo was opened from it, otherwise (a shared link) replaced, so
// Back doesn't reopen it.
function closePhoto() {
  const query = { ...route.query };
  delete query.photo;
  if (window.history.state?.back === router.resolve({ query }).fullPath) router.back();
  else router.replace({ query });
}
</script>

<template>
  <EventSection v-if="images.length" label="Gallery">
    <ul
      class="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 sm:mx-0 sm:scroll-px-0 sm:px-0"
    >
      <li v-for="(url, index) in images" :key="url" class="shrink-0 snap-start">
        <NuxtLink :to="photoLink(index)" :aria-label="`Photo ${index + 1}`" class="block">
          <img
            :src="resizedImage(url, 640, 480)"
            crossorigin="anonymous"
            alt=""
            loading="lazy"
            decoding="async"
            class="h-48 w-64 bg-block object-cover sm:h-60 sm:w-80"
          />
        </NuxtLink>
      </li>
    </ul>
    <p v-if="credit" class="mt-2 text-xs text-ink-muted">Photos: {{ credit }}</p>
    <PhotoViewer
      v-if="openIndex !== null"
      :images="images"
      :index="openIndex"
      @close="closePhoto"
      @show="showPhoto"
    />
  </EventSection>
</template>
