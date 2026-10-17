/** Pages without parameters. Lists are personal and left out. */
const STATIC_PATHS = ["/", "/trail", "/map", "/about"];

function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

export default defineEventHandler(async (event) => {
  // Behind the reverse proxy the app itself is reached over plain http.
  const { origin } = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  const [{ events }, { installations }] = await Promise.all([
    getFestivalEvents(event),
    getInstallations(event),
  ]);
  const paths = new Set([
    ...STATIC_PATHS,
    ...events.map(({ kind, slug }) => `/${kind}/${slug}`),
    ...installations.map(({ slug }) => `/trail/${slug}`),
  ]);
  const urls = [...paths].map((path) => `  <url><loc>${escapeXml(origin + path)}</loc></url>`);

  setResponseHeader(event, "Content-Type", "application/xml; charset=utf-8");
  setResponseHeader(event, "Cache-Control", "public, max-age=3600");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
});
