const SAVED_KEY = "kikk-offline-saved";
const CHECK_INTERVAL = 60 * 60 * 1000;
const CONCURRENCY = 4;

interface Saved {
  /** Hash of the schedule and art trail that were saved. */
  version: string;
  checkedAt: number;
}

export default defineNuxtPlugin(() => {
  const online = useOnline();
  // After hydration, as the server render assumes online.
  onNuxtReady(() => {
    const update = () => (online.value = navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    void saveForOffline();
  });
});

/**
 * Fetches every event and installation through the service worker, which keeps them, so all
 * their pages open offline, not just visited ones. Runs again when the data changes.
 */
async function saveForOffline() {
  if (!("serviceWorker" in navigator) || !navigator.onLine) return;
  if ((navigator as { connection?: { saveData?: boolean } }).connection?.saveData) return;
  const saved = readSaved();
  if (saved && Date.now() - saved.checkedAt < CHECK_INTERVAL) return;

  await navigator.serviceWorker.ready;
  // Requests only pass through the service worker once it controls the page.
  if (!navigator.serviceWorker.controller) {
    await new Promise((resolve) =>
      navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }),
    );
  }

  const [schedule, trail] = await Promise.all([
    $fetch<EventsResponse>("/api/events").catch(() => null),
    $fetch<TrailResponse>("/api/trail").catch(() => null),
  ]);
  if (!schedule || !trail) return;
  const version = hash(JSON.stringify([schedule.events, trail.installations]));
  if (saved?.version !== version) {
    const queue = [
      ...schedule.events.map((event) => `/api/events${eventPath(event)}`),
      ...trail.installations.map((installation) => `/api${installationPath(installation)}`),
    ];
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        for (let url = queue.shift(); url; url = queue.shift()) {
          await $fetch(url).catch(() => {});
        }
      }),
    );
  }
  writeSaved({ version, checkedAt: Date.now() });
}

function readSaved(): Saved | null {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "null");
  } catch {
    return null;
  }
}

function writeSaved(saved: Saved) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  } catch {
    // Without storage this simply runs again next time.
  }
}

function hash(value: string): string {
  let result = 5381;
  for (let i = 0; i < value.length; i++) result = (result * 33) ^ value.charCodeAt(i);
  return (result >>> 0).toString(36);
}
