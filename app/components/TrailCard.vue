<script setup lang="ts">
defineProps<{ item: TrailItem }>();
</script>

<template>
  <NuxtLink :to="installationPath(item)" class="group block">
    <img
      v-if="item.image"
      :src="resizedImage(item.image, 600)"
      crossorigin="anonymous"
      alt=""
      loading="lazy"
      decoding="async"
      class="aspect-4/3 w-full clip-corner bg-block object-cover"
    />
    <div v-else class="aspect-4/3 w-full clip-corner bg-block" />
    <span
      class="mt-2 block font-display leading-tight font-bold text-balance wrap-break-word hyphens-auto uppercase group-hover:underline"
    >
      {{ item.title }}
    </span>
    <span v-if="item.artist" class="mt-0.5 block text-sm text-neutral-500">{{ item.artist }}</span>
  </NuxtLink>
</template>
