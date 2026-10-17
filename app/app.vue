<script setup lang="ts">
// Defaults for link previews (WhatsApp, Signal, …). Event and art trail pages set their own image.
// Behind the reverse proxy the app itself is reached over plain http.
const origin = useRequestURL({ xForwardedHost: true, xForwardedProto: true }).origin;
useSeoMeta({
  description:
    "Unofficial timetable for KIKK Festival 2026 in Namur, with talks, parties, the art trail and your favorites. Works offline.",
  ogSiteName: "KIKK 2026 Timetable",
  ogType: "website",
  ogImage: `${origin}/og-image.png`,
  twitterCard: "summary_large_image",
});
</script>

<template>
  <div class="bg-paper font-sans text-ink antialiased">
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>
