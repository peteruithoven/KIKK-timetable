<script setup lang="ts">
const props = defineProps<{
  event: TimetableEvent;
  /** Card height in px. */
  height: number;
}>();

const LINE_HEIGHT = 16; // leading-4
// Margin rather than padding, so the clamped lines don't show in it.
const MARGIN = 8; // my-1
const BORDER = 2; // border, top and bottom
const MIN_IMAGE_HEIGHT = 32;

const { isFavorite } = useFavorites();
const favorite = computed(() => isFavorite(props.event.id));

const showImage = computed(() => Boolean(props.event.image) && props.height >= 64);

// Too short for the margin around the title, e.g. 10 minute events: one line, no margin.
const compact = computed(() => props.height - BORDER < LINE_HEIGHT + MARGIN);

// Whole lines only, leaving room for at least a strip of the image.
const titleStyle = computed(() => {
  const available = props.height - BORDER - MARGIN - (showImage.value ? MIN_IMAGE_HEIGHT : 0);
  return { "--lines": Math.max(1, Math.floor(available / LINE_HEIGHT)) };
});
</script>

<template>
  <NuxtLink
    :to="eventPath(event)"
    :data-favorite="favorite ? event.id : undefined"
    :title="`${event.start}${event.end ? `–${event.end}` : ''} · ${event.title}`"
    class="group absolute flex flex-col overflow-hidden border transition-colors focus-visible:outline-none"
    :class="
      favorite
        ? 'clip-corner border-ink bg-ink text-paper hover:border-neutral-700 hover:bg-neutral-700 focus-visible:border-neutral-700 focus-visible:bg-neutral-700'
        : 'bevel-corner border-ink bg-paper hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper'
    "
    :style="{ height: `${height}px` }"
  >
    <span
      class="mx-1.5 line-clamp-(--lines) shrink-0 pr-1 font-display text-[13px] leading-4 font-semibold text-balance wrap-break-word hyphens-auto group-focus-visible:underline"
      :class="compact ? 'my-0' : 'my-1'"
      :style="titleStyle"
    >
      <template v-if="favorite">
        <Icon
          name="material-symbols:star"
          class="mr-0.5 size-3.5 align-[-2px]"
          aria-hidden="true"
        /><span class="sr-only">Favorite: </span>
      </template>
      {{ event.title }}
    </span>
    <img
      v-if="showImage"
      :src="resizedImage(event.image!, 400)"
      crossorigin="anonymous"
      alt=""
      loading="lazy"
      decoding="async"
      class="min-h-0 w-full flex-1 object-cover"
    />
  </NuxtLink>
</template>
