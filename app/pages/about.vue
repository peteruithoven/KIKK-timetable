<script setup lang="ts">
useSeoMeta({
  title: "About · KIKK 2026 Timetable",
  description: "An unofficial timetable for KIKK Festival 2026, a side project by Peter Uithoven.",
});

const linkClass =
  "underline decoration-line underline-offset-4 transition-colors hover:decoration-ink";

// Behind the reverse proxy the app itself is reached over plain http.
const appUrl = `${useRequestURL({ xForwardedHost: true, xForwardedProto: true }).origin}/`;
</script>

<template>
  <div class="min-h-dvh text-red-600 **:text-red-600">
    <nav
      class="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-line bg-paper px-4 py-3"
    >
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 bevel-corner border border-line px-3 py-1.5 font-display text-xs font-semibold tracking-[0.12em] uppercase transition-colors hover:border-ink"
      >
        <Icon name="material-symbols:arrow-left-alt" class="size-4" aria-hidden="true" /> Timetable
      </NuxtLink>
    </nav>

    <main class="mx-auto max-w-5xl px-4 pt-6 pb-16">
      <p class="font-display text-[11px] font-semibold tracking-[0.3em] text-neutral-500 uppercase">
        KIKK Festival 2026
      </p>
      <h1
        class="mt-1 font-display text-4xl leading-none font-extrabold tracking-tight uppercase sm:text-6xl"
      >
        About
      </h1>

      <div class="mt-6 max-w-prose space-y-4 text-lg leading-relaxed">
        <p>
          This unofficial timetable is a side project by Peter Uithoven. I wanted an easier way to
          explore the KIKK programme and save my favorites, so I built one. It isn’t affiliated with
          KIKK.
        </p>
        <p>
          I'm at KIKK with
          <a href="https://avecsans.studio" target="_blank" rel="noopener" :class="linkClass"
            >Avec Sans</a
          >, the studio I love working with, so come say hello!
        </p>
        <p>
          Use the timetable to keep track of the talks, parties, and artworks you don’t want to
          miss. No account needed.
        </p>
        <p>
          The programme updates automatically from
          <a
            href="https://www.kikkfestival.be/schedule"
            target="_blank"
            rel="noopener"
            :class="linkClass"
            >kikkfestival.be</a
          >, the official source, with changes usually appearing here within a few minutes. If KIKK
          can’t be reached or you’re offline, you can still browse the last saved programme.
        </p>
        <p class="text-neutral-700">
          The code is mostly AI-generated and available
          <a
            href="https://github.com/peteruithoven/KIKK-timetable"
            target="_blank"
            rel="noopener"
            :class="linkClass"
            >on GitHub</a
          >
          under the MIT license.
        </p>
        <p class="text-neutral-700">
          Questions or feedback? Reach me at
          <a href="mailto:peter@peteruithoven.nl" :class="linkClass">peter@peteruithoven.nl</a>.
        </p>
      </div>

      <section id="share" class="mt-10 max-w-prose scroll-mt-20 border-y border-line py-6">
        <h2 class="font-display text-2xl font-extrabold tracking-tight uppercase">Share</h2>
        <p class="mt-2 text-neutral-700">
          Know someone heading to the festival? Send them the link, or let them scan the code.
        </p>
        <div class="mt-5 flex flex-wrap items-start gap-6">
          <QrCodeButton :url="appUrl" label="KIKK 2026 Timetable" class="w-40" />
          <div class="flex flex-col items-start gap-2">
            <ShareButton
              :url="appUrl"
              title="KIKK 2026 Timetable"
              text="Unofficial timetable for KIKK Festival 2026, with talks, parties, the art trail and your favorites."
            />
            <CopyButton :value="appUrl" />
            <p class="mt-1 text-sm break-all text-neutral-500">{{ appUrl }}</p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
