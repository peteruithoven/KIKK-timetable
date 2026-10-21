const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', nbsp: " " };

/**
 * The intro and description in both languages as searchable text: folded (see `foldText()`)
 * without markup, each word once, since a search only looks for words.
 */
export function searchText(...texts: (Localized | null)[]): string {
  const html = texts.flatMap((text) => [text?.en, text?.fr]).join(" ");
  const plain = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&(\w+);/g, (entity, name: string) => ENTITIES[name] ?? entity);
  return [...new Set(foldText(plain).split(/\s+/).filter(Boolean))].join(" ");
}
