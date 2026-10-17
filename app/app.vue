<script setup lang="ts">
import interTight from "@fontsource-variable/inter-tight/files/inter-tight-latin-wght-normal.woff2?url";

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
// Event images come from Kikk's Supabase. Its URL is server-only config, so it's passed on in
// the payload; without it the client would drop the preconnect on hydration.
const config = useRuntimeConfig();
const imageOrigin = useState("image-origin", () =>
  config.supabaseUrl ? new URL(config.supabaseUrl).origin : null,
);
useHead({
  link: [
    { rel: "canonical", href: pageUrl },
    // The display font's Latin subset, so headings don't wait for the stylesheet to request it.
    { rel: "preload", as: "font", type: "font/woff2", href: interTight, crossorigin: "anonymous" },
    // Anonymous, like the images (crossorigin="anonymous"), or the connection can't be reused.
    ...(imageOrigin.value
      ? [{ rel: "preconnect" as const, href: imageOrigin.value, crossorigin: "anonymous" as const }]
      : []),
  ],
});
</script>

<template>
  <div class="bg-paper font-sans text-ink antialiased">
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>
