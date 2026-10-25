<script setup lang="ts">
// An icon button that turns into a search field. It grows to fill its row, so the parent
// decides how much room it gets, using `open` to make room. Start it open when there's a search.
defineProps<{ placeholder: string }>();
const search = defineModel<string>({ required: true });
const open = defineModel<boolean>("open", { required: true });

const input = useTemplateRef<HTMLInputElement>("input");
const button = useTemplateRef<HTMLButtonElement>("button");

async function openSearch() {
  open.value = true;
  await nextTick();
  input.value?.focus();
}

async function closeSearch() {
  search.value = "";
  open.value = false;
  await nextTick();
  button.value?.focus();
}
</script>

<template>
  <div v-if="open" role="search" class="relative min-w-0 flex-1 sm:max-w-72">
    <label>
      <span class="sr-only">Search</span>
      <Icon
        name="material-symbols:search"
        class="pointer-events-none absolute top-1/2 left-2 size-5 -translate-y-1/2"
        aria-hidden="true"
      />
      <!-- 16px text, or iOS zooms in on focus. -->
      <input
        ref="input"
        v-model="search"
        type="search"
        enterkeyhint="search"
        :placeholder="placeholder"
        class="w-full bevel-corner appearance-none border border-ink bg-paper py-1 pr-9 pl-8 text-base leading-6 outline-none placeholder:text-ink-muted [&::-webkit-search-cancel-button]:hidden"
        @keydown.esc="closeSearch"
        @keydown.enter="input?.blur()"
        @blur="search.trim() || (open = false)"
      />
    </label>
    <button
      type="button"
      class="absolute top-1/2 right-1 flex -translate-y-1/2 p-1 text-ink-muted transition-colors hover:text-ink"
      @click="closeSearch"
    >
      <Icon name="material-symbols:close" class="size-5" aria-hidden="true" />
      <span class="sr-only">Close search</span>
    </button>
  </div>
  <button
    v-else
    ref="button"
    type="button"
    class="inline-flex shrink-0 items-center bevel-corner border border-line p-2 transition-colors hover:border-ink"
    @click="openSearch"
  >
    <Icon name="material-symbols:search" class="size-4" aria-hidden="true" />
    <span class="sr-only">Search</span>
  </button>
</template>
