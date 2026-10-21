/**
 * Descriptions of events and art trail works to search in, by id. Separate from `/api/events`
 * and `/api/trail`, so pages only load them once someone searches.
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  const [{ events }, { installations }] = await Promise.all([
    getFestivalEvents(event),
    getInstallations(event),
  ]);
  return Object.fromEntries(
    [...events, ...installations].map((item) => [
      item.id,
      searchText(item.intro, item.description),
    ]),
  );
});
