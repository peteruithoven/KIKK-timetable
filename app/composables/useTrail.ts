export function useTrail() {
  return useFetch("/api/trail", {
    key: "trail",
    // Runs on the server, so descriptions and bios stay out of the page payload.
    transform: (response: TrailResponse) => ({
      updatedAt: response.updatedAt,
      stale: response.stale,
      installations: response.installations.map((installation): TrailItem => ({
        id: installation.id,
        slug: installation.slug,
        title: installation.title,
        artist: installation.artist?.name ?? null,
        venue: installation.venue,
        image: installation.image,
      })),
    }),
  });
}
