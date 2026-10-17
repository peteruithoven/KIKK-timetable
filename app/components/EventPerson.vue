<script setup lang="ts">
const props = defineProps<{ person: Person }>();

const details = computed(() =>
  [localize(props.person.role)?.text, props.person.company, localize(props.person.location)?.text]
    .filter(Boolean)
    .join(" · "),
);
const bio = computed(() => localize(props.person.bio));
</script>

<template>
  <div class="flex gap-4">
    <img
      v-if="person.photo"
      :src="resizedImage(person.photo, 160, 160)"
      crossorigin="anonymous"
      alt=""
      loading="lazy"
      class="size-16 shrink-0 bg-block object-cover sm:size-20"
    />
    <div class="min-w-0">
      <p class="font-display text-lg leading-tight font-bold">{{ person.name }}</p>
      <p v-if="details" class="mt-0.5 text-sm text-neutral-500">{{ details }}</p>
      <!-- Sanitized on the server, see server/utils/kikk-mapping.ts -->
      <div
        v-if="bio"
        class="rich-text mt-3 max-w-prose text-sm leading-relaxed text-neutral-700"
        :lang="bio.lang"
        v-html="bio.text"
      />
    </div>
  </div>
</template>
