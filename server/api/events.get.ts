export default defineEventHandler((event) => {
  setResponseHeader(event, "Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return getFestivalEvents(event);
});
