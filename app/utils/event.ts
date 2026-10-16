export const KIND_LABELS: Record<EventKind, string> = {
  talk: "Talk",
  panel: "Panel",
  party: "Party",
};

export function eventPath(event: Pick<FestivalEvent, "kind" | "slug">): string {
  return `/${event.kind}/${event.slug}`;
}

/** English when available, otherwise French, with its language for the `lang` attribute. */
export function localize(
  text: Localized | null | undefined,
): { text: string; lang: string } | null {
  if (text?.en) return { text: text.en, lang: "en" };
  if (text?.fr) return { text: text.fr, lang: "fr" };
  return null;
}
