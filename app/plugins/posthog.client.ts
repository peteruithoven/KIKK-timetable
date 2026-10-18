import posthog, { type PostHog } from "posthog-js";

// A favorites list id gives edit access, so it's replaced everywhere in an event: page URLs,
// autocaptured calendar links (also URL-encoded, for Google Calendar) and fetch error messages.
const LIST_ID_IN_URL = /(lists?(?:\/|%2F))[a-z]+-[a-z]+-\d{4}/gi;

function scrubListIds<T>(value: T): T {
  if (typeof value === "string") return value.replace(LIST_ID_IN_URL, "$1:id") as T;
  if (Array.isArray(value)) return value.map(scrubListIds) as T;
  // Only plain objects: the event's timestamp is a Date. Keys too: heatmap data is keyed by URL.
  if (value?.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [scrubListIds(key), scrubListIds(item)]),
    ) as T;
  }
  return value;
}

export default defineNuxtPlugin((nuxtApp) => {
  const { public: publicConfig } = useRuntimeConfig();
  const { projectToken, host } = publicConfig.posthog;

  if (!projectToken || !host) {
    if (import.meta.dev) {
      const variable = projectToken
        ? "NUXT_PUBLIC_POSTHOG_HOST"
        : "NUXT_PUBLIC_POSTHOG_PROJECT_TOKEN";
      console.warn(`PostHog is disabled: ${variable} is not set.`);
    }

    return { provide: { posthog: undefined as PostHog | undefined } };
  }

  const posthogClient = posthog.init(projectToken, {
    api_host: host,
    cookieless_mode: "always",
    // Also client-side navigation, not only the first page load.
    capture_pageview: "history_change",
    before_send: (event) => event && scrubListIds(event),
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
  });

  nuxtApp.hook("vue:error", (error) => {
    posthogClient.captureException(error);
  });

  return { provide: { posthog: posthogClient as PostHog | undefined } };
});
