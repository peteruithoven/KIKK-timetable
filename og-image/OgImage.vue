<script setup lang="ts">
// The link preview card, public/og-image.png. Only served during development, at /og-image.
// Regenerate with `vp run og-image` while the dev server runs on port 3000.
useHead({
  title: "OG image",
  // Keep the Nuxt DevTools button out of the screenshot.
  style: [{ innerHTML: "#nuxt-devtools-container { display: none !important; }" }],
});
</script>

<template>
  <div
    class="relative h-[630px] w-[1200px] overflow-hidden bg-paper px-20 py-[72px] font-light text-ink"
  >
    <p class="font-display text-[22px] font-semibold tracking-[0.3em] text-ink-muted uppercase">
      KIKK Festival 2026
    </p>
    <h1
      class="mt-[18px] font-display text-[184px] leading-[0.85] font-extrabold tracking-[-0.03em] uppercase"
    >
      Timetable
    </h1>
    <p class="mt-9 max-w-[640px] text-[32px] leading-[1.4]">
      Talks, parties, the art trail and your favorites. Works offline.
    </p>
    <div class="absolute inset-x-20 bottom-16 flex items-center gap-6 border-t-2 border-ink pt-8">
      <span
        class="clip-corner bg-ink px-[22px] py-3 font-display text-[22px] font-bold tracking-[0.12em] text-paper uppercase [--corner:14px]"
      >
        Unofficial
      </span>
      <span class="font-display text-[22px] font-semibold tracking-[0.12em] uppercase">
        Namur · 22–24 October
      </span>
      <!-- The mark from public/favicon.svg. -->
      <svg class="ml-auto h-16" viewBox="7 3 48 58.1" aria-hidden="true">
        <path
          d="M43.1128 14.4532L55 26.1042L42.9535 37.8116L54.978 49.464L43.0398 61.0311L30.9556 49.4231L19.0527 61.0812L7.02768 49.4618L7 26.2338L30.8287 3.00316L31.0438 26.1341L43.1128 14.4532Z"
          fill="currentColor"
        />
      </svg>
    </div>
  </div>
</template>
