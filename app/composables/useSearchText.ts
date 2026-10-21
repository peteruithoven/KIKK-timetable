/**
 * Descriptions to search in, by event or art trail work id. Loaded in the browser once there's
 * a search, so they stay out of the page payload. Until then, searches skip them.
 */
export function useSearchText(search: Ref<string>) {
  const { data, execute, status } = useFetch<Record<string, string>>("/api/search-text", {
    key: "search-text",
    server: false,
    immediate: false,
  });
  if (import.meta.client) {
    watch(
      search,
      (q) => {
        if (q.trim() && status.value === "idle") void execute();
      },
      { immediate: true },
    );
  }
  return computed(() => data.value ?? {});
}
