/** Lowercase, ё→е, collapse spaces. */
export function normSearch(s: string): string {
  return s.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

/** Every word of the query (first 4+ letters as a rough stem) must appear in the text. */
export function matchesAll(text: string, query: string): boolean {
  const t = normSearch(text);
  return normSearch(query).split(" ").filter(Boolean).every((w) => t.includes(w.length > 5 ? w.slice(0, w.length - 2) : w));
}
