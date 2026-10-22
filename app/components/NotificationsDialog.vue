<script setup lang="ts">
/** Offers notifications once, after the first favorite. See FavoriteButton. */
const push = usePushNotifications();
const favorites = useFavorites();
const { $posthog } = useNuxtApp();
const dialog = useTemplateRef("dialog");
const busy = ref(false);
const failed = ref(false);

function offer() {
  if (readPushFlag("kikk-notifications-offered")) return;
  // Not when they're on already, or can't be turned on.
  if (push.status.value !== "off" && push.status.value !== "install") return;
  writePushFlag("kikk-notifications-offered");
  failed.value = false;
  dialog.value?.showModal();
  $posthog?.capture("notifications_offered", { status: push.status.value });
}

async function enable() {
  busy.value = true;
  failed.value = false;
  try {
    const enabled = await push.enable();
    $posthog?.capture(enabled ? "notifications_enabled" : "notifications_permission_denied");
    dialog.value?.close();
  } catch {
    failed.value = true;
  } finally {
    busy.value = false;
  }
}

defineExpose({ offer });
</script>

<template>
  <dialog
    ref="dialog"
    aria-labelledby="notifications-dialog-title"
    class="m-auto w-[calc(100%-2rem)] max-w-md border border-ink bg-paper p-6 text-ink backdrop:bg-black/60"
  >
    <h2 id="notifications-dialog-title" class="font-display text-lg font-bold">Get a reminder?</h2>
    <p class="mt-2 text-sm text-ink-soft">
      Get a notification {{ NOTIFY_MINUTES_BEFORE }} minutes before each of your favorites starts.
    </p>
    <p v-if="push.status.value === 'install'" class="mt-2 text-sm text-ink-soft">
      On iPhone and iPad, notifications only work in the app. Tap Share, then Add to Home Screen,
      and turn them on in your favorites list.
    </p>
    <p v-else class="mt-2 text-sm text-ink-soft">
      You can change this later in
      <NuxtLink
        v-if="favorites.listId.value"
        :to="listPath(favorites.listId.value)"
        class="underline"
        @click="dialog?.close()"
        >your favorites list</NuxtLink
      ><template v-else>your favorites list</template>.
    </p>
    <p v-if="failed" role="alert" class="mt-2 text-sm text-ink-soft">
      That didn't work. Check your connection and try again.
    </p>
    <div class="mt-5 flex flex-wrap justify-end gap-2">
      <button
        type="button"
        class="bevel-corner border border-ink px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] uppercase transition-colors hover:bg-ink hover:text-paper"
        @click="dialog?.close()"
      >
        {{ push.status.value === "install" ? "OK" : "Not now" }}
      </button>
      <button
        v-if="push.status.value !== 'install'"
        type="button"
        :disabled="busy"
        class="inline-flex items-center gap-2 clip-corner bg-ink px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] text-paper uppercase transition-colors hover:bg-ink-soft disabled:opacity-60"
        @click="enable"
      >
        <Icon
          name="material-symbols:notifications-active-outline"
          class="size-4"
          aria-hidden="true"
        />
        Turn on
      </button>
    </div>
  </dialog>
</template>
