<script setup lang="ts">
const props = defineProps<{
  event: TimetableEvent;
  /** Card height in px. */
  height: number;
}>();

const LINE_HEIGHT = 15; // text-xs leading-tight
// Margin rather than padding, so the clamped lines don't show in it.
const MARGIN = 8; // my-1
const MIN_IMAGE_HEIGHT = 32;

const showImage = computed(() => Boolean(props.event.image) && props.height >= 64);

// Whole lines only, leaving room for at least a strip of the image.
const titleStyle = computed(() => {
  const available = props.height - MARGIN - (showImage.value ? MIN_IMAGE_HEIGHT : 0);
  return { "--lines": Math.max(1, Math.floor(available / LINE_HEIGHT)) };
});
</script>

<template>
  <a
    :href="event.url"
    target="_blank"
    rel="noopener"
    :title="`${event.start}${event.end ? `–${event.end}` : ''} · ${event.title}`"
    class="group absolute flex flex-col overflow-hidden rounded-sm bg-zinc-800 transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-accent"
    :style="{ height: `${height}px` }"
  >
    <span
      class="mx-2 my-1 line-clamp-(--lines) shrink-0 text-xs leading-tight font-semibold text-balance wrap-break-word"
      :style="titleStyle"
    >
      {{ event.title }}
    </span>
    <img
      v-if="showImage"
      :src="resizedImage(event.image!, 400)"
      alt=""
      loading="lazy"
      decoding="async"
      class="min-h-0 w-full flex-1 object-cover opacity-90 transition-opacity group-hover:opacity-100"
    />
  </a>
</template>
