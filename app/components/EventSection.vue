<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <section class="grid gap-3 border-t border-line py-8 sm:grid-cols-[10rem_1fr] sm:gap-8">
    <h2
      class="pt-1 font-display text-[11px] font-semibold tracking-[0.3em] text-ink-muted uppercase"
    >
      {{ label }}
    </h2>
    <div class="min-w-0">
      <slot />
    </div>
  </section>
</template>
