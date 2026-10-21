/**
 * Search text, kept in the URL (`?q=`) so it's still there when coming back to the page.
 * Typed into a ref: an input bound to the route would lag behind the navigation. Once someone
 * stops typing, it's sent to PostHog as `trackingEvent`, with the number of results.
 */
export function useSearchQuery(trackingEvent: string, results: () => number) {
  const route = useRoute();
  const router = useRouter();
  const search = ref(typeof route.query.q === "string" ? route.query.q : "");
  watch(search, (q) => {
    const { q: _, ...query } = route.query;
    void router.replace({ query: q ? { ...query, q } : query });
  });

  const { $posthog } = useNuxtApp();
  let timer: ReturnType<typeof setTimeout> | undefined;
  watch(search, (q) => {
    clearTimeout(timer);
    if (!q.trim()) return;
    timer = setTimeout(() => {
      $posthog?.capture(trackingEvent, { search_query: q.trim(), results: results() });
    }, 1500);
  });
  onBeforeUnmount(() => clearTimeout(timer));

  return search;
}
