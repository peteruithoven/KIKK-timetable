<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    value: string;
    label?: string;
    trackingEvent?: "favorites_link_copied" | "calendar_link_copied";
  }>(),
  { label: "Copy link" },
);

const copied = ref(false);
const { $posthog } = useNuxtApp();
async function copy() {
  await navigator.clipboard.writeText(props.value);
  props.trackingEvent && $posthog?.capture(props.trackingEvent);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-2 bevel-corner border border-ink px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] uppercase transition-colors hover:bg-ink hover:text-paper"
    @click="copy"
  >
    <Icon name="material-symbols:content-copy-outline" class="size-4" aria-hidden="true" />
    {{ copied ? "Copied" : label }}
  </button>
</template>
