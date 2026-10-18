/**
 * schema.org data for search engines, see https://developers.google.com/search/docs/appearance/structured-data/event.
 * Kikk's own pages only describe the festival as a whole.
 */

const KIKK = { "@type": "Organization", name: "KIKK", url: "https://kikkfestival.be" };

function place(venue: string | null) {
  const known = findVenue(venue);
  return {
    "@type": "Place",
    name: venue ?? "Namur",
    address: {
      "@type": "PostalAddress",
      ...(known && { streetAddress: known.street }),
      postalCode: "5000",
      addressLocality: "Namur",
      addressCountry: "BE",
    },
    ...(known && {
      geo: {
        "@type": "GeoCoordinates",
        latitude: known.coordinates[1],
        longitude: known.coordinates[0],
      },
    }),
  };
}

/**
 * The artists of a party, from its title (Kikk's `artist_name`), e.g.
 * "Martin Messier — 1 DROP 1000 YEARS + Dalidark b2b Joe d’Absynth" → Martin Messier, Dalidark and
 * Joe d’Absynth. Acts are separated by "·" or "+", a work title follows "—".
 */
function partyArtists(title: string): string[] {
  return title
    .split(/ [·+] /)
    .flatMap((act) => act.split(" — ")[0]!.split(/ b2b /i))
    .map((name) => name.trim())
    .filter(Boolean);
}

function performers(event: FestivalEvent) {
  if (event.kind === "party") {
    return partyArtists(event.title).map((name) => ({ "@type": "Person", name }));
  }
  return event.speakers.map((speaker) => ({
    "@type": "Person",
    name: speaker.name,
    ...(speaker.company && { affiliation: { "@type": "Organization", name: speaker.company } }),
  }));
}

export function eventStructuredData(event: FestivalEvent, url: string, description?: string) {
  const performer = performers(event);
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    url,
    description,
    image: event.image ?? undefined,
    startDate: event.startsAt ?? event.date,
    endDate: event.endsAt ?? undefined,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: place(event.venue),
    performer: performer.length ? performer : undefined,
    organizer: KIKK,
    inLanguage: event.language ?? undefined,
    ...(event.ticketUrl && { offers: { "@type": "Offer", url: event.ticketUrl } }),
  };
}

export function websiteStructuredData(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "KIKK 2026 Timetable",
    url: `${origin}/`,
  };
}

/** A `useHead` script. `<` is escaped so CMS text can't close the script element. */
export function jsonLdScript(data: () => object) {
  return {
    type: "application/ld+json" as const,
    innerHTML: () => JSON.stringify(data()).replaceAll("<", "\\u003c"),
  };
}
