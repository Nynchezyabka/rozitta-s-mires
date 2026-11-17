/** Item tags (categories): bright auto colours from Rozitta's palette, optional per-device overrides. */
export const TAG_COLORS = ["#7CFF3A", "#FFB547", "#C38BFF", "#FF7AB6", "#3FE0C5", "#FFE45C", "#FF8A5C", "#6FB7FF", "#B8F06A", "#E58FFF"];
const KEY = "rozitta-tag-colors";

/** One spelling per tag: trimmed, single spaces, capital first letter. */
export function normTag(t: string | null | undefined): string | null {
  const s = (t ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  return s ? s[0]!.toUpperCase() + s.slice(1) : null;
}

/** Same name → same colour on every device, without storing anything. */
export function autoTagColor(tag: string): string {
  let h = 0;
  for (const c of tag.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TAG_COLORS[h % TAG_COLORS.length]!;
}

function overrides(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}
export const tagColor = (tag: string) => overrides()[tag.toLowerCase()] ?? autoTagColor(tag);
export function setTagColor(tag: string, color: string | null) {
  const o = overrides();
  if (color) o[tag.toLowerCase()] = color; else delete o[tag.toLowerCase()];
  localStorage.setItem(KEY, JSON.stringify(o));
}

/** Tag cloud: how many things carry each tag, biggest first. */
export function tagCounts(items: { category?: string | null }[]): { tag: string; count: number }[] {
  const m = new Map<string, { tag: string; count: number }>();
  for (const it of items) {
    const t = normTag(it.category);
    if (!t) continue;
    const k = t.toLowerCase();
    const cur = m.get(k);
    if (cur) cur.count++; else m.set(k, { tag: t, count: 1 });
  }
  return [...m.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "ru"));
}
