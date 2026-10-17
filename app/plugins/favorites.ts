export default defineNuxtPlugin(async () => {
  const listId = useState<string | null>("favorites-id", () => null);
  const events = useState<string[]>("favorites-events", () => []);

  if (import.meta.server) {
    // Load the list during server rendering, so favorites are highlighted right away.
    const id = useCookie(LIST_COOKIE, { readonly: true }).value;
    if (typeof id === "string" && LIST_ID_PATTERN.test(id)) {
      const list = await $fetch<FavoritesList>(`/api/lists/${id}`).catch(() => null);
      if (list) {
        listId.value = list.id;
        events.value = list.events;
      }
    }
    return;
  }

  // After hydration, so restoring from localStorage doesn't cause a mismatch.
  const favorites = useFavorites();
  onNuxtReady(() => favorites.restore());
  window.addEventListener("online", () => favorites.flush());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void favorites.flush();
  });
});
