export default defineEventHandler(async (event) => {
  const { slug } = getRouterParams(event);
  const { installations } = await getInstallations(event);
  const found = installations.find((installation) => installation.slug === slug);
  if (!found) {
    throw createError({ statusCode: 404, statusMessage: "Installation not found" });
  }
  setResponseHeader(event, "Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return found;
});
