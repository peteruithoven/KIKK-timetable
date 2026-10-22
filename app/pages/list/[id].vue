<script setup lang="ts">
const route = useRoute();
const id = String(route.params.id);

const { data: list, error } = await useFetch<FavoritesList>(`/api/lists/${id}`);
if (!list.value) {
  throw createError({
    status: error.value?.status ?? 404,
    statusText: "List not found",
    fatal: true,
  });
}
const [{ data: schedule }, { data: trail }] = await Promise.all([useSchedule(), useTrail()]);
const favorites = useFavorites();
const { $posthog } = useNuxtApp();

const isOwn = computed(() => favorites.listId.value === id);
// This device's latest state for its own list, including unsaved changes.
const favoriteIds = computed(
  () => new Set(isOwn.value ? favorites.events.value : list.value?.events),
);

const days = computed(() => {
  const byDay = new Map<string, TimetableEvent[]>();
  for (const event of schedule.value?.events ?? []) {
    if (favoriteIds.value.has(event.id))
      byDay.set(event.date, [...(byDay.get(event.date) ?? []), event]);
  }
  return [...byDay]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, events]) => {
      events.sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
      return {
        date,
        events: events.map((event, index) => ({
          event,
          // Time since the previous favorite ended, negative when they overlap.
          gap: index ? minutesBetween(events[index - 1]!, event) : null,
          walk: index ? walkingMinutes(events[index - 1]!.venue, event.venue) : null,
        })),
      };
    });
});

const installations = computed(
  () => trail.value?.installations.filter((item) => favoriteIds.value.has(item.id)) ?? [],
);
const isEmpty = computed(() => days.value.length === 0 && installations.value.length === 0);

// Behind the reverse proxy the app itself is reached over plain http.
const origin = useRequestURL({ xForwardedHost: true, xForwardedProto: true }).origin;
const shareUrl = `${origin}${listPath(id)}`;
// Calendar apps subscribe to this and check it for changes regularly.
const calendarUrl = `${origin}/api/lists/${id}/calendar.ics`;
const googleCalendarUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calendarUrl.replace(/^https?:/, "webcal:"))}`;

// Only this browser knows them, so they're loaded after hydration. Empty ones aren't worth
// switching back to.
const previousLists = ref<FavoritesList[]>([]);
onMounted(() =>
  watch(
    favorites.listId,
    async () => {
      const lists = await Promise.all(
        favorites
          .previousListIds()
          .map((other) => $fetch<FavoritesList>(`/api/lists/${other}`).catch(() => null)),
      );
      previousLists.value = lists.filter((other): other is FavoritesList => !!other?.events.length);
    },
    { immediate: true },
  ),
);
// The lists to switch between, besides this one. Includes the one in use when viewing another.
// Only when this device used several, otherwise "Back to your list" covers it.
const otherLists = computed(() => {
  if (!previousLists.value.length) return [];
  const current = favorites.listId.value;
  return [
    ...(current && !isOwn.value
      ? [
          {
            id: current,
            label: favorites.label.value,
            count: favorites.events.value.length,
            inUse: true,
          },
        ]
      : []),
    ...previousLists.value
      .filter((list) => list.id !== id)
      .map((list) => ({
        id: list.id,
        label: list.label,
        count: list.events.length,
        inUse: false,
      })),
  ];
});

// Labels are written by people and can be personal: elements showing them are `ph-sensitive`, so
// PostHog's autocapture leaves out their text. Also keep them out of the page title.
const label = computed(() => (isOwn.value ? favorites.label.value : list.value?.label));
const labelInput = useTemplateRef("labelInput");
const editingLabel = ref(false);
const labelDraft = ref("");
const savingLabel = ref(false);
const labelError = ref(false);
async function editLabel() {
  labelDraft.value = label.value ?? "";
  labelError.value = false;
  editingLabel.value = true;
  await nextTick();
  labelInput.value?.focus();
}
async function saveLabel() {
  savingLabel.value = true;
  labelError.value = false;
  try {
    await favorites.setLabel(labelDraft.value);
    $posthog?.capture("favorites_list_labeled", { has_label: !!favorites.label.value });
    editingLabel.value = false;
  } catch {
    labelError.value = true;
  } finally {
    savingLabel.value = false;
  }
}

const switchDialog = useTemplateRef("switchDialog");
const adopting = ref(false);
async function adopt() {
  adopting.value = true;
  try {
    await favorites.adopt(id);
    $posthog?.capture("favorites_list_adopted");
    // The page then shows this list as this device's own.
    switchDialog.value?.close();
  } finally {
    adopting.value = false;
  }
}

function startCalendarSubscription() {
  $posthog?.capture("calendar_subscription_started", { calendar_provider: "google" });
}

// Lists are personal, and their link gives edit access.
useSeoMeta({ title: "Favorites · KIKK 2026", robots: "noindex" });
</script>

<template>
  <div class="min-h-dvh">
    <nav class="border-b border-line px-4 py-3">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 bevel-corner border border-line px-3 py-1.5 font-display text-xs font-semibold tracking-[0.12em] uppercase transition-colors hover:border-ink"
      >
        <Icon name="material-symbols:arrow-left-alt" class="size-4" aria-hidden="true" /> Timetable
      </NuxtLink>
    </nav>

    <main class="mx-auto max-w-3xl px-4 pt-6 pb-16">
      <p class="font-display text-[11px] font-semibold tracking-[0.3em] text-ink-muted uppercase">
        Favorites
      </p>
      <form
        v-if="editingLabel"
        class="mt-2 flex flex-wrap gap-2"
        @submit.prevent="saveLabel"
        @keydown.esc="editingLabel = false"
      >
        <input
          ref="labelInput"
          v-model="labelDraft"
          :maxlength="LIST_LABEL_MAX_LENGTH"
          aria-label="Label"
          placeholder="Add a label"
          class="min-w-0 flex-1 basis-60 border border-ink px-3 py-2 font-display text-xl font-bold"
        />
        <div class="flex gap-2">
          <button
            type="submit"
            :disabled="savingLabel"
            class="clip-corner bg-ink px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] text-paper uppercase transition-colors hover:bg-ink-soft disabled:opacity-60"
          >
            Save
          </button>
          <button
            type="button"
            class="bevel-corner border border-ink px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] uppercase transition-colors hover:bg-ink hover:text-paper"
            @click="editingLabel = false"
          >
            Cancel
          </button>
        </div>
        <p v-if="labelError" role="alert" class="basis-full text-sm text-ink-soft">
          The label couldn't be saved. Check your connection and try again.
        </p>
      </form>
      <template v-else>
        <div class="mt-1 flex items-start gap-3">
          <h1
            class="ph-sensitive min-w-0 font-display text-3xl font-extrabold tracking-tight sm:text-5xl"
            :class="label ? 'wrap-break-word' : 'break-all'"
          >
            {{ label || id }}
          </h1>
          <button
            v-if="isOwn"
            type="button"
            :aria-label="label ? 'Edit label' : 'Add label'"
            class="mt-0.5 shrink-0 border border-transparent p-1.5 transition-colors hover:border-line sm:mt-2.5 bevel-corner"
            @click="editLabel"
          >
            <Icon name="material-symbols:edit-outline" class="block size-5" aria-hidden="true" />
          </button>
        </div>
        <p v-if="label" class="mt-1 text-sm text-ink-muted">{{ id }}</p>
      </template>

      <!-- Collapsed, so returning visitors see their favorites right away. -->
      <details v-if="isOwn" :open="isEmpty" class="group mt-6 border-y border-line">
        <summary
          class="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-lg font-bold [&::-webkit-details-marker]:hidden"
        >
          Share your list
          <Icon
            name="material-symbols:expand-more"
            class="size-6 shrink-0 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <p class="max-w-prose text-sm text-ink-soft">
          This is your list. Open this link on another device to see and change the same favorites,
          or share it with friends to plan together. Anyone with the link can change the list.
        </p>
        <div class="mt-4 flex flex-wrap gap-2 pb-5">
          <input
            :value="shareUrl"
            readonly
            aria-label="Link to this list"
            class="min-w-0 flex-1 basis-60 border border-line px-3 py-2 text-sm"
            @focus="($event.target as HTMLInputElement).select()"
          />
          <ShareButton
            :url="shareUrl"
            title="My KIKK 2026 favorites"
            tracking-event="favorites_list_shared"
          />
          <CopyButton :value="shareUrl" tracking-event="favorites_link_copied" />
        </div>
      </details>

      <section v-else class="mt-6 border-y border-line py-5">
        <p class="max-w-prose text-sm text-ink-soft">
          Someone shared the following favorites with you.
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            :disabled="adopting"
            class="clip-corner bg-ink px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] text-paper uppercase transition-colors hover:bg-ink-soft disabled:opacity-60"
            @click="favorites.events.value.length ? switchDialog?.showModal() : adopt()"
          >
            Switch to this list on this device
          </button>
          <NuxtLink
            v-if="favorites.listId.value"
            :to="listPath(favorites.listId.value)"
            class="bevel-corner border border-ink px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] uppercase transition-colors hover:bg-ink hover:text-paper"
          >
            Back to your list
          </NuxtLink>
        </div>

        <!-- Only when there's something to lose: this device's own favorites. -->
        <dialog
          ref="switchDialog"
          aria-labelledby="switch-dialog-title"
          class="m-auto w-[calc(100%-2rem)] max-w-md border border-ink bg-paper p-6 text-ink backdrop:bg-black/60"
        >
          <h2 id="switch-dialog-title" class="font-display text-lg font-bold">
            Switch to this list?
          </h2>
          <p class="mt-2 text-sm text-ink-soft">
            Your timetable will show these favorites, and your changes show up for everyone who uses
            this list.
            <template v-if="favorites.listId.value">
              Your current list ({{ favorites.events.value.length }}
              {{ favorites.events.value.length === 1 ? "favorite" : "favorites" }}) stays available
              at
              <NuxtLink :to="listPath(favorites.listId.value)" class="underline">
                {{ listPath(favorites.listId.value) }}</NuxtLink
              >.
            </template>
          </p>
          <div class="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              class="bevel-corner border border-ink px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] uppercase transition-colors hover:bg-ink hover:text-paper"
              @click="switchDialog?.close()"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="adopting"
              class="clip-corner bg-ink px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] text-paper uppercase transition-colors hover:bg-ink-soft disabled:opacity-60"
              @click="adopt"
            >
              Switch
            </button>
          </div>
        </dialog>
      </section>

      <NotificationsSection v-if="isOwn" />

      <details class="group border-b border-line">
        <summary
          class="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-lg font-bold [&::-webkit-details-marker]:hidden"
        >
          Add to your calendar
          <Icon
            name="material-symbols:expand-more"
            class="size-6 shrink-0 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <p class="max-w-prose text-sm text-ink-soft">
          Subscribe to {{ isOwn ? "your" : "these" }} favorites in your calendar app. It stays up to
          date: new favorites and schedule changes show up by themselves. Calendar apps check for
          changes every few hours, Google Calendar can take up to a day.
          <template v-if="installations.length">
            Art trail works aren't included, they have no set times.
          </template>
        </p>
        <p class="mt-2 max-w-prose text-sm text-ink-soft">
          Or add them once with a calendar file. New favorites and schedule changes won't show up
          then.
        </p>
        <div class="mt-4 flex flex-wrap gap-2 pb-5">
          <a
            :href="googleCalendarUrl"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1.5 clip-corner bg-ink px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] text-paper uppercase transition-colors hover:bg-ink-soft"
            @click="startCalendarSubscription"
          >
            Google Calendar
            <Icon name="material-symbols:arrow-outward" class="size-4" aria-hidden="true" />
          </a>
          <!-- No download attribute: iOS then shows its "Add All" sheet, Android and desktop
               browsers download it anyway, as they can't display it. -->
          <a
            :href="calendarUrl"
            class="inline-flex items-center gap-2 bevel-corner border border-ink px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] uppercase transition-colors hover:bg-ink hover:text-paper"
            @click="$posthog?.capture('calendar_file_downloaded')"
          >
            <Icon name="material-symbols:download" class="size-4" aria-hidden="true" />
            Calendar file
          </a>
          <CopyButton
            :value="calendarUrl"
            label="Copy calendar link"
            tracking-event="calendar_link_copied"
          />
        </div>
      </details>

      <details v-if="otherLists.length" class="group border-b border-line">
        <summary
          class="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-lg font-bold [&::-webkit-details-marker]:hidden"
        >
          Your lists
          <Icon
            name="material-symbols:expand-more"
            class="size-6 shrink-0 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <ul class="border-t border-line">
          <li
            v-for="other in otherLists"
            :key="other.id"
            class="border-b border-line last:border-b-0"
          >
            <NuxtLink
              :to="listPath(other.id)"
              class="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-block"
            >
              <span v-if="other.label" class="ph-sensitive min-w-0">
                <span class="block font-display font-semibold wrap-break-word">
                  {{ other.label }}
                </span>
                <span class="block text-xs break-all text-ink-muted">{{ other.id }}</span>
              </span>
              <span v-else class="min-w-0 font-display font-semibold break-all">{{
                other.id
              }}</span>
              <span class="shrink-0 text-xs text-ink-muted">
                <template v-if="other.inUse">In use · </template>
                {{ other.count }} {{ other.count === 1 ? "favorite" : "favorites" }}
              </span>
            </NuxtLink>
          </li>
        </ul>
      </details>

      <p v-if="isEmpty" class="mt-8 text-ink-muted">
        No favorites yet. Open an event in the timetable or a work on the art trail and add it to
        your favorites.
      </p>
      <section v-for="day in days" :key="day.date" class="mt-8">
        <h2 class="font-display text-lg font-bold">
          {{ formatDay(day.date, { weekday: "long", day: "numeric", month: "long" }) }}
        </h2>
        <ul class="mt-2 border-t border-ink">
          <li
            v-for="{ event, gap, walk } in day.events"
            :key="event.id"
            class="relative border-b border-line"
          >
            <!-- On the line above, below the previous favorite's end time. Red when there's no
                 time to get there. -->
            <span
              v-if="gap !== null"
              class="absolute -top-2 left-0 bg-paper pr-1.5 text-[11px] leading-4 tabular-nums"
              :class="gap < (walk ?? 0) ? 'text-red-700/80 dark:text-red-400/80' : 'text-ink-faint'"
            >
              <span class="sr-only">{{ gap < 0 ? "Overlaps by" : "Break of" }} </span>
              {{ gap < 0 ? `−${formatDuration(-gap)}` : gap ? formatDuration(gap) : "No break" }}
              <template v-if="walk"> · {{ walk }} min walk</template>
            </span>
            <NuxtLink
              :to="eventPath(event)"
              class="flex gap-4 py-3 transition-colors hover:bg-block"
            >
              <!-- The end time sits at the bottom of the item. -->
              <span
                class="flex w-12 shrink-0 flex-col justify-between gap-1 text-sm text-ink-muted tabular-nums"
              >
                <span>{{ event.start }}</span>
                <span v-if="event.end"><span class="sr-only">to </span>{{ event.end }}</span>
              </span>
              <span class="min-w-0">
                <span class="block font-display leading-tight font-semibold">
                  {{ event.title }}
                </span>
                <span
                  v-if="event.speakers || event.venue"
                  class="mt-0.5 block text-xs text-ink-muted"
                >
                  {{ [event.speakers, event.venue].filter(Boolean).join(" · ") }}
                </span>
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>
      <section v-if="installations.length" class="mt-8">
        <h2 class="font-display text-lg font-bold">Art trail</h2>
        <ul class="mt-2 border-t border-ink">
          <li v-for="item in installations" :key="item.id" class="border-b border-line">
            <NuxtLink
              :to="installationPath(item)"
              class="flex items-center gap-4 py-3 transition-colors hover:bg-block"
            >
              <img
                v-if="item.image"
                :src="resizedImage(item.image, 96, 96)"
                crossorigin="anonymous"
                alt=""
                loading="lazy"
                class="size-12 shrink-0 bg-block object-cover"
              />
              <span v-else class="size-12 shrink-0 bg-block" />
              <span class="min-w-0">
                <span class="block font-display leading-tight font-semibold">
                  {{ item.title }}
                </span>
                <span class="mt-0.5 block text-xs text-ink-muted">
                  {{ [item.artist, item.venue].filter(Boolean).join(" · ") }}
                </span>
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>
