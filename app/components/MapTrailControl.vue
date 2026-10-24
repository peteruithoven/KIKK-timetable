<script setup lang="ts">
defineProps<{ pressed: boolean }>();
defineEmits<{ toggle: [] }>();
</script>

<template>
  <!-- Same size and pressed style as the location button. -->
  <button
    type="button"
    aria-label="Art trail works per place"
    title="Art trail works per place"
    :aria-pressed="pressed"
    class="grid size-[29px] place-items-center bg-paper transition-colors hover:bg-ink hover:text-paper hover:inset-ring hover:inset-ring-paper aria-pressed:bg-ink aria-pressed:text-paper aria-pressed:inset-ring aria-pressed:inset-ring-paper"
    @click="$emit('toggle')"
  >
    <Icon
      :name="pressed ? 'material-symbols:palette' : 'material-symbols:palette-outline'"
      class="size-5"
      aria-hidden="true"
    />
  </button>
</template>
