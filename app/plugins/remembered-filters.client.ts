// Applies the filters this device remembers when arriving on the timetable or the map, see
// `rememberedQuery()`. Within the app that happens before the page renders. On the first load
// the server can't know them, so they're applied after hydration (the page shows unfiltered
// for a moment).
export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter();
  const favorites = useState<string[]>("favorites-events", () => []);

  addRouteMiddleware(
    "remembered-filters",
    (to, from) => {
      // Only on arrival: changing filters on the page itself isn't undone.
      if (nuxtApp.isHydrating || to.path === from.path) return;
      const query = rememberedQuery(to.path, to.query, favorites.value.length > 0);
      if (query) return { path: to.path, query, hash: to.hash };
    },
    { global: true },
  );

  nuxtApp.hooks.hookOnce("app:suspense:resolve", () => {
    const route = router.currentRoute.value;
    const query = rememberedQuery(route.path, route.query, favorites.value.length > 0);
    if (query) void router.replace({ query, hash: route.hash });
  });
});
