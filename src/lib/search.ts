/** Lowercase, ё→е, collapse spaces. */
export function normSearch(s: string): string {
  return s.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

/** Unicode words keep Russian, numbers and punctuation-separated names searchable. */
export function searchWords(text: string): string[] {
  return normSearch(text).match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** Every query word must match a word start; retain the existing rough inflection stem. */
export function matchesAll(text: string, query: string): boolean {
  const words = searchWords(text);
  return searchWords(query).every((w) => {
    const stem = w.length > 5 ? w.slice(0, w.length - 2) : w;
    return words.some((word) => word.startsWith(stem));
  });
}
