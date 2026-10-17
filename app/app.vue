<script setup lang="ts">
// Defaults for link previews (WhatsApp, Signal, …). Event and art trail pages set their own image.
// Behind the reverse proxy the app itself is reached over plain http.
const origin = useRequestURL({ xForwardedHost: true, xForwardedProto: true }).origin;
// Without the query, so filtered views (`/?day=…`) count as the page itself.
const route = useRoute();
const pageUrl = computed(() => `${origin}${route.path}`);
useSeoMeta({
  description:
    "Unofficial timetable for KIKK Festival 2026 in Namur, with talks, parties, the art trail and your favorites. Works offline.",
  ogSiteName: "KIKK 2026 Timetable",
  ogType: "website",
  ogUrl: pageUrl,
  ogImage: { url: `${origin}/og-image.png`, width: 1200, height: 630 },
  twitterCard: "summary_large_image",
});
useHead({ link: [{ rel: "canonical", href: pageUrl }] });
</script>

<template>
  <div class="bg-paper font-sans text-ink antialiased">
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>
