<script setup lang="ts">
const push = usePushNotifications();
const { $posthog } = useNuxtApp();
const busy = ref(false);
const failed = ref(false);

// Open until someone closes it, so it's noticed.
const open = useRememberedOpen("notifications", () => true);

async function toggle() {
  busy.value = true;
  failed.value = false;
  try {
    if (push.status.value === "on") {
      await push.disable();
      $posthog?.capture("notifications_disabled");
    } else {
      const enabled = await push.enable();
      $posthog?.capture(enabled ? "notifications_enabled" : "notifications_permission_denied");
    }
  } catch {
    failed.value = true;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <details :open="open" class="group border-b border-line" @toggle="open = detailsOpen($event)">
    <summary
      class="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-lg font-bold [&::-webkit-details-marker]:hidden"
    >
      Notifications
      <Icon
        name="material-symbols:expand-more"
        class="size-6 shrink-0 transition-transform group-open:rotate-180"
        aria-hidden="true"
      />
    </summary>
    <p class="max-w-prose text-sm text-ink-soft">
      Get a notification {{ NOTIFY_MINUTES_BEFORE }} minutes before each of your favorites starts,
      also for favorites added on other devices that use this list.
    </p>
    <div class="pt-4 pb-5">
      <p v-if="push.status.value === 'install'" class="max-w-prose text-sm text-ink-soft">
        On iPhone and iPad, notifications only work in the app. Tap Share, then Add to Home Screen,
        and open the timetable from your home screen.
      </p>
      <p v-else-if="push.status.value === 'unsupported'" class="max-w-prose text-sm text-ink-soft">
        This browser doesn't support notifications.
      </p>
      <p v-else-if="push.status.value === 'denied'" class="max-w-prose text-sm text-ink-soft">
        Notifications are blocked for this site. Allow them in your browser's settings, then come
        back here.
      </p>
      <template v-else-if="push.status.value !== 'unknown'">
        <button
          type="button"
          :disabled="busy"
          class="inline-flex items-center gap-2 disabled:opacity-60"
          :class="
            push.status.value === 'on'
              ? 'bevel-corner border border-ink px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] uppercase transition-colors hover:bg-ink hover:text-paper'
              : 'clip-corner bg-ink px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] text-paper uppercase transition-colors hover:bg-ink-soft'
          "
          @click="toggle"
        >
          <Icon
            :name="
              push.status.value === 'on'
                ? 'material-symbols:notifications-off-outline'
                : 'material-symbols:notifications-active-outline'
            "
            class="size-4"
            aria-hidden="true"
          />
          {{ push.status.value === "on" ? "Turn off" : "Turn on" }}
        </button>
        <p v-if="push.status.value === 'on'" class="mt-3 text-sm text-ink-soft">
          Notifications are on for this device.
        </p>
        <p v-if="failed" role="alert" class="mt-3 text-sm text-ink-soft">
          That didn't work. Check your connection and try again.
        </p>
      </template>
    </div>
  </details>
</template>
