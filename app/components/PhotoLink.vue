<script setup lang="ts">
// A single image (a cover photo, a portrait) that opens full screen in the photo viewer, as
// `?photo=<name>`. The image itself is the slot.
const props = defineProps<{ src: string; name: string; label: string }>();
defineOptions({ inheritAttrs: false });

const { photo, photoLink, closePhoto } = usePhotoQuery();
const open = computed(() => photo.value === props.name);
</script>

<template>
  <NuxtLink v-bind="$attrs" :to="photoLink(name)" :aria-label="label" class="block">
    <slot />
  </NuxtLink>
  <PhotoViewer v-if="open" :images="[src]" :index="0" :label="label" @close="closePhoto" />
</template>
