<script setup lang="ts">
import { renderSVG } from "uqr";

const props = defineProps<{
  url: string;
  // Shown under the full screen code.
  label: string;
}>();

const qrCode = computed(() => renderSVG(props.url, { blackColor: "#121212", border: 2 }));

// Full screen, so it's easy to scan from someone else's phone.
const dialog = useTemplateRef("dialog");
</script>

<template>
  <div>
    <button
      type="button"
      class="block w-full border border-line p-1 transition-colors hover:border-ink"
      aria-label="Show QR code full screen"
      @click="dialog?.showModal()"
    >
      <span class="block [&>svg]:block [&>svg]:w-full" aria-hidden="true" v-html="qrCode" />
    </button>

    <dialog
      ref="dialog"
      aria-label="QR code"
      class="m-0 h-dvh max-h-none w-full max-w-none bg-paper p-6 text-ink"
      @click="dialog?.close()"
    >
      <div class="flex h-full flex-col items-center justify-center gap-6">
        <div
          class="w-full max-w-[min(32rem,70dvh)] [&>svg]:block [&>svg]:w-full"
          aria-hidden="true"
          v-html="qrCode"
        />
        <p class="font-display text-sm font-semibold tracking-[0.12em] uppercase">
          {{ label }}
        </p>
        <p class="text-sm text-neutral-500">Tap to close</p>
      </div>
    </dialog>
  </div>
</template>
