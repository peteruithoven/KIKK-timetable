<script setup lang="ts">
const props = defineProps<{
  url: string;
  title: string;
  text?: string;
  trackingEvent?: "favorites_list_shared" | "event_shared" | "installation_shared";
  trackingProperties?: Record<string, unknown>;
  /** Outlined, next to a primary button. */
  secondary?: boolean;
}>();
const { $posthog } = useNuxtApp();

// Not rendered where the browser has no share sheet, like desktop Firefox.
const canShare = ref(false);
onMounted(() => (canShare.value = typeof navigator.share === "function"));
function share() {
  navigator
    .share({ title: props.title, text: props.text, url: props.url })
    .then(
      () => props.trackingEvent && $posthog?.capture(props.trackingEvent, props.trackingProperties),
    )
    .catch(() => {});
}
</script>

<template>
  <button
    v-if="canShare"
    type="button"
    class="inline-flex items-center gap-2 px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] uppercase transition-colors"
    :class="
      secondary
        ? 'bevel-corner border border-ink hover:bg-ink hover:text-paper'
        : 'clip-corner bg-ink text-paper hover:bg-ink-soft'
    "
    @click="share"
  >
    <Icon name="material-symbols:share" class="size-4" aria-hidden="true" /> Share
  </button>
</template>
