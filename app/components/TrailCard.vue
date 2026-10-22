<script setup lang="ts">
const props = defineProps<{ item: TrailItem }>();

const { isFavorite } = useFavorites();
const favorite = computed(() => isFavorite(props.item.id));
</script>

<template>
  <NuxtLink :to="installationPath(item)" class="group block">
    <img
      v-if="item.image"
      :src="resizedImage(item.image, 600, 450)"
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
      <template v-if="favorite">
        <Icon name="material-symbols:star" class="mr-0.5 size-4 align-[-2px]" aria-hidden="true" />
        <span class="sr-only">Favorite: </span>
      </template>
      {{ item.title }}
    </span>
    <span v-if="item.artist" class="mt-0.5 block text-sm text-ink-muted">{{ item.artist }}</span>
  </NuxtLink>
</template>
