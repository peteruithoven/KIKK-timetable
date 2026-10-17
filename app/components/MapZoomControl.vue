<script setup lang="ts">
const emit = defineEmits<{ zoomIn: []; zoomOut: [] }>();

const buttons = [
  { label: "Zoom in", icon: "material-symbols:add", action: () => emit("zoomIn") },
  { label: "Zoom out", icon: "material-symbols:remove", action: () => emit("zoomOut") },
];
</script>

<template>
  <!-- Same size as MapLibre's NavigationControl. -->
  <div class="flex flex-col divide-y divide-line bg-paper">
    <button
      v-for="button in buttons"
      :key="button.icon"
      type="button"
      :aria-label="button.label"
      :title="button.label"
      class="grid size-[29px] place-items-center transition-colors hover:bg-ink hover:text-paper"
      @click="button.action"
    >
      <Icon :name="button.icon" class="size-5" aria-hidden="true" />
    </button>
  </div>
</template>
