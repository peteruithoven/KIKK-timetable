<script setup lang="ts">
/** Adds an event or installation to this device's favorites, or removes it. */
const props = defineProps<{ id: string }>();

const favorites = useFavorites();
const favorite = computed(() => favorites.isFavorite(props.id));
const { $posthog } = useNuxtApp();

function toggle() {
  const event = favorite.value ? "favorite_removed" : "favorite_added";
  favorites.toggle(props.id);
  $posthog?.capture(event, { content_type: props.id.split(":", 1)[0] });
}
</script>

<template>
  <button
    type="button"
    :aria-pressed="favorite"
    class="inline-flex items-center gap-2 bevel-corner border border-ink px-3 py-1.5 font-display text-xs font-bold tracking-[0.12em] uppercase transition-colors"
    :class="
      favorite
        ? 'clip-corner bg-ink text-paper hover:bg-neutral-700'
        : 'hover:bg-ink hover:text-paper'
    "
    @click="toggle"
  >
    <Icon
      :name="favorite ? 'material-symbols:star' : 'material-symbols:star-outline'"
      class="size-5"
      aria-hidden="true"
    />
    {{ favorite ? "Favorite" : "Add to favorites" }}
  </button>
</template>
