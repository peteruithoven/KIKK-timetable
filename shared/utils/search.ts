/** Lowercase without accents, so "generatif" finds "Génératif". */
export function foldText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Whether every word of the query is in one of the texts. */
export function matchesSearch(query: string, ...texts: (string | null)[]): boolean {
  const words = foldText(query).split(/\s+/).filter(Boolean);
  const text = foldText(texts.join(" "));
  return words.every((word) => text.includes(word));
}
