/** Calendar months, clamped to the last day of the target month. */
export function extendDecision(now = new Date()): string {
  const end = new Date(now.getFullYear(), now.getMonth() + 4, 0);
  const target = new Date(now.getFullYear(), now.getMonth() + 3, Math.min(now.getDate(), end.getDate()));
  return localDate(target);
}
export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function boxContents(id: string, items: { box_id: string; name: string }[], clothes: { box_id: string | null; name: string; owner: string; size: string }[]): string[] {
  return [...items.filter((i) => i.box_id === id).map((i) => i.name), ...clothes.filter((c) => c.box_id === id).map((c) => [c.name, c.owner, c.size].filter(Boolean).join(" · "))];
}

/** Only saved household tokens are queried; failed houses do not hide a later match. */
export async function findBoxHouse<T extends { household: { name: string }; boxes: { id: string }[] }>(id: string, tokens: string[], read: (token: string) => Promise<T>) {
  let failed = false;
  for (const token of [...new Set(tokens)]) {
    try {
      const data = await read(token);
      if (data.boxes.some((b) => b.id === id)) return { match: { token, data }, failed };
    } catch { failed = true; }
  }
  return { match: null, failed };
}