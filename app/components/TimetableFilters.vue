<script setup lang="ts">
// The timetable's filters on phones, where they don't fit next to the days: a button that opens
// a popover with the search, the venue and "Only favorites". The button is filled while any
// filter applies and counts them. A native popover, so outside clicks and Escape close it.
import type { Venue } from "~/utils/venues";

defineProps<{ venues: readonly Venue[] }>();
const search = defineModel<string>("search", { required: true });
const venue = defineModel<string>("venue", { required: true });
const onlyFavorites = defineModel<boolean>("onlyFavorites", { required: true });

// The number of filters that apply.
const active = computed(
  () =>
    [search.value.trim() !== "", venue.value !== "all", onlyFavorites.value].filter(Boolean).length,
);

const id = useId();
const button = useTemplateRef<HTMLButtonElement>("button");
const panel = useTemplateRef<HTMLElement>("panel");
// Below the button, across the width of the screen.
const top = ref(0);
const open = ref(false);

function onToggle(event: Event) {
  open.value = (event as ToggleEvent).newState === "open";
}

function onBeforeToggle(event: Event) {
  if ((event as ToggleEvent).newState !== "open" || !button.value) return;
  top.value = button.value.getBoundingClientRect().bottom + 8;
}

function clear() {
  search.value = "";
  venue.value = "all";
  onlyFavorites.value = false;
}
</script>

<template>
  <button
    ref="button"
    type="button"
    :popovertarget="id"
    :aria-expanded="open"
    class="inline-flex shrink-0 items-center gap-1.5 bevel-corner border px-3 py-2 font-display text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
    :class="
      active
        ? 'clip-corner border-ink bg-ink text-paper hover:bg-ink-soft'
        : 'border-line bg-paper text-ink hover:border-ink'
    "
  >
    <Icon name="material-symbols:filter-list" class="size-4" aria-hidden="true" />
    Filter
    <span v-if="active" class="tabular-nums">
      {{ active }}<span class="sr-only"> active</span>
    </span>
  </button>
  <div
    :id="id"
    ref="panel"
    popover
    aria-label="Filters"
    :style="{ top: `${top}px` }"
    class="right-4 bottom-auto left-4 m-0 h-fit max-h-[70dvh] w-auto overflow-auto border border-ink bg-paper p-4 text-ink shadow-[0_8px_24px_rgb(0_0_0/0.2)]"
    @beforetoggle="onBeforeToggle"
    @toggle="onToggle"
  >
    <div class="flex flex-col gap-4">
      <label role="search" class="flex flex-col gap-1.5">
        <span
          class="font-display text-[11px] font-semibold tracking-[0.3em] text-ink-muted uppercase"
        >
          Search
        </span>
        <span class="relative">
          <Icon
            name="material-symbols:search"
            class="pointer-events-none absolute top-1/2 left-2 size-5 -translate-y-1/2"
            aria-hidden="true"
          />
          <!-- 16px text, or iOS zooms in on focus. -->
          <input
            v-model="search"
            type="search"
            enterkeyhint="search"
            placeholder="Title, speaker, tag"
            class="w-full bevel-corner appearance-none border border-line bg-paper py-1.5 pr-9 pl-8 text-base leading-6 outline-none placeholder:text-ink-muted focus:border-ink [&::-webkit-search-cancel-button]:hidden"
            @keydown.enter="($event.target as HTMLInputElement).blur()"
          />
          <button
            v-if="search"
            type="button"
            class="absolute top-1/2 right-1 flex -translate-y-1/2 p-1 text-ink-muted transition-colors hover:text-ink"
            @click="search = ''"
          >
            <Icon name="material-symbols:close" class="size-5" aria-hidden="true" />
            <span class="sr-only">Clear search</span>
          </button>
        </span>
      </label>

      <label class="flex flex-col gap-1.5">
        <span
          class="font-display text-[11px] font-semibold tracking-[0.3em] text-ink-muted uppercase"
        >
          Venue
        </span>
        <span class="relative">
          <select
            v-model="venue"
            class="w-full bevel-corner appearance-none truncate border py-2 pr-8 pl-3 font-display text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
            :class="
              venue === 'all'
                ? 'border-line bg-paper text-ink hover:border-ink'
                : 'clip-corner border-ink bg-ink text-paper'
            "
          >
            <option value="all">All venues</option>
            <option v-for="option in venues" :key="option.key" :value="option.key">
              {{ option.name }}
            </option>
          </select>
          <Icon
            name="material-symbols:keyboard-arrow-down"
            class="pointer-events-none absolute top-1/2 right-2 size-5 -translate-y-1/2"
            :class="venue === 'all' ? 'text-ink' : 'text-paper'"
            aria-hidden="true"
          />
        </span>
      </label>

      <button
        type="button"
        :aria-pressed="onlyFavorites"
        class="inline-flex items-center gap-2 bevel-corner border px-3 py-2 font-display text-xs font-semibold tracking-[0.12em] uppercase transition-colors"
        :class="
          onlyFavorites
            ? 'clip-corner border-ink bg-ink text-paper hover:bg-ink-soft'
            : 'border-line hover:border-ink'
        "
        @click="onlyFavorites = !onlyFavorites"
      >
        <Icon
          :name="onlyFavorites ? 'material-symbols:star' : 'material-symbols:star-outline'"
          class="size-4"
          aria-hidden="true"
        />
        Only favorites
      </button>

      <div class="flex justify-between gap-2">
        <button
          type="button"
          :disabled="!active"
          class="font-display text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase underline-offset-2 transition-colors hover:text-ink hover:underline disabled:invisible"
          @click="clear"
        >
          Clear all
        </button>
        <button
          type="button"
          class="clip-corner bg-ink px-4 py-2 font-display text-xs font-semibold tracking-[0.12em] text-paper uppercase transition-colors hover:bg-ink-soft"
          @click="panel?.hidePopover()"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>
