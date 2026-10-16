export default defineEventHandler(async (event) => {
  const { kind, slug } = getRouterParams(event);
  const { events } = await getFestivalEvents(event);
  const found = events.find((e) => e.kind === kind && e.slug === slug);
  if (!found) {
    throw createError({ statusCode: 404, statusMessage: "Event not found" });
  }
  setResponseHeader(event, "Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return found;
});
