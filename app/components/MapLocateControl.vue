<script setup lang="ts">
import type { LocateState } from "~/composables/useMapGeolocation";

const props = defineProps<{ state: LocateState }>();
defineEmits<{ locate: [] }>();

const BUTTONS: Record<LocateState, { label: string; icon: string }> = {
  off: { label: "Show my location", icon: "material-symbols:location-searching" },
  // Rotates slowly, like a loading indicator.
  waiting: { label: "Finding your location…", icon: "material-symbols:radar" },
  // Following the location: clicking turns it off.
  active: { label: "Hide my location", icon: "material-symbols:my-location" },
  // Location shown, but the map was moved away from it.
  background: { label: "Center on my location", icon: "material-symbols:my-location-outline" },
  error: { label: "Location not found, try again", icon: "material-symbols:location-disabled" },
  denied: { label: "Location access denied", icon: "material-symbols:location-disabled" },
};

const button = computed(() => BUTTONS[props.state]);
</script>

<template>
  <!-- Same size as the zoom buttons. -->
  <button
    type="button"
    :aria-label="button.label"
    :title="button.label"
    :aria-pressed="state === 'active'"
    class="grid size-[29px] place-items-center bg-paper transition-colors hover:bg-ink hover:text-paper hover:inset-ring hover:inset-ring-paper aria-pressed:bg-ink aria-pressed:text-paper aria-pressed:inset-ring aria-pressed:inset-ring-paper"
    @click="$emit('locate')"
  >
    <Icon
      :name="button.icon"
      class="size-5"
      :class="{ 'motion-safe:animate-[spin_2s_linear_infinite]': state === 'waiting' }"
      aria-hidden="true"
    />
  </button>
</template>
