export function useSchedule() {
  return useFetch("/api/events", {
    key: "schedule",
    // Runs on the server, so descriptions and bios stay out of the page payload.
    transform: (response: EventsResponse) => ({
      updatedAt: response.updatedAt,
      stale: response.stale,
      events: response.events.map((event): TimetableEvent => ({
        id: event.id,
        kind: event.kind,
        title: event.title,
        url: event.url,
        date: event.date,
        start: event.start,
        end: event.end,
        startsAt: event.startsAt,
        venue: event.venue,
        image: event.image,
      })),
    }),
  });
}
