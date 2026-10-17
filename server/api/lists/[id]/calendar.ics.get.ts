// A favorites list as a calendar people can subscribe to. Calendar apps fetch it again
// regularly, so new favorites and schedule changes show up by themselves.
const KIND_LABELS: Record<EventKind, string> = { talk: "Talk", panel: "Panel", party: "Party" };

export default defineEventHandler(async (event) => {
  const id = parseListId(getRouterParam(event, "id"));
  const list = await readList(event, id);
  if (!list) throw createError({ statusCode: 404, statusMessage: "List not found" });

  const { events } = await getFestivalEvents(event);
  const origin = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin;
  const favorites = new Set(list.events);

  const calendar = toICalendar(
    "KIKK 2026 favorites",
    `Favorites from the KIKK 2026 Timetable: ${origin}/list/${id}`,
    events
      .filter((e) => favorites.has(e.id) && e.startsAt)
      .map((e) => {
        const speaker = e.kind === "talk" ? e.speakers[0]?.name : undefined;
        const text = e.intro ?? e.description;
        const url = `${origin}/${e.kind}/${e.slug}`;
        return {
          uid: `${e.id}@kikk-timetable`,
          start: e.startsAt!,
          end: e.endsAt,
          title: speaker ? `${speaker}: ${e.title}` : e.title,
          location: e.venue ? `${e.venue}, Namur` : null,
          description: [text?.en || text?.fr ? htmlToText((text.en ?? text.fr)!) : null, url]
            .filter(Boolean)
            .join("\n\n"),
          url,
          categories: KIND_LABELS[e.kind],
        };
      }),
    list.updatedAt,
  );

  setResponseHeaders(event, {
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": 'inline; filename="kikk-2026-favorites.ics"',
    "Cache-Control": "public, max-age=300",
  });
  return calendar;
});
