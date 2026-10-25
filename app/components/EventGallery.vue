<script setup lang="ts">
const props = defineProps<{ images: string[]; credit?: string | null }>();

const { photo, photoLink, showPhoto, closePhoto } = usePhotoQuery();
const openIndex = computed(() => {
  const number = Number(photo.value);
  return Number.isInteger(number) && number >= 1 && number <= props.images.length
    ? number - 1
    : null;
});
</script>

<template>
  <EventSection v-if="images.length" label="Gallery">
    <ul
      class="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 sm:mx-0 sm:scroll-px-0 sm:px-0"
    >
      <li v-for="(url, index) in images" :key="url" class="shrink-0 snap-start">
        <NuxtLink :to="photoLink(index + 1)" :aria-label="`Photo ${index + 1}`" class="block">
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
      @show="(index) => showPhoto(index + 1)"
    />
  </EventSection>
</template>
