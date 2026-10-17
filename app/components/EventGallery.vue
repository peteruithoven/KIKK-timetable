<script setup lang="ts">
defineProps<{ images: string[]; credit?: string | null }>();
</script>

<template>
  <EventSection v-if="images.length" label="Gallery">
    <ul
      class="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 sm:mx-0 sm:scroll-px-0 sm:px-0"
    >
      <li v-for="url in images" :key="url" class="shrink-0 snap-start">
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
    <p v-if="credit" class="mt-2 text-xs text-neutral-500">Photos: {{ credit }}</p>
  </EventSection>
</template>
