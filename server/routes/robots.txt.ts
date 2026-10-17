// A route rather than a file in public/, as the sitemap needs an absolute URL.
export default defineEventHandler((event) => {
  const { origin } = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  setResponseHeader(event, "Content-Type", "text/plain; charset=utf-8");
  setResponseHeader(event, "Cache-Control", "public, max-age=86400");
  return ["User-agent: *", "Allow: /", "", `Sitemap: ${origin}/sitemap.xml`, ""].join("\n");
});
