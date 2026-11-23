/** Wardrobe vocabulary and the «Что надеть?» picker (pure, testable). */
export const LAYERS = [
  { id: "top", label: "Верх", icon: "👕" }, { id: "bottom", label: "Низ", icon: "👖" }, { id: "dress", label: "Платья", icon: "👗" },
  { id: "outer", label: "Верхняя", icon: "🧥" }, { id: "shoes", label: "Обувь", icon: "👟" }, { id: "acc", label: "Аксессуары", icon: "🧣" },
] as const;
export const SEASONS = [
  { id: "winter", label: "Зима", icon: "❄️" }, { id: "summer", label: "Лето", icon: "☀️" },
  { id: "mid", label: "Демисезон", icon: "🍂" }, { id: "all", label: "Всесезон", icon: "♾️" },
] as const;
export const STATUSES = [
  { id: "closet", label: "В шкафу", icon: "🚪" }, { id: "stored", label: "На хранении", icon: "📦" },
  { id: "grow", label: "На вырост", icon: "🌱" }, { id: "give", label: "Отдать", icon: "🎁" },
] as const;

export const pick = <T extends { id: string }>(list: readonly T[], id: string | null | undefined, fallback: string) =>
  list.find((x) => x.id === id)?.id ?? fallback;

/** Season by month: Dec–Feb winter, Jun–Aug summer, else mid. */
export function currentSeason(d = new Date()) {
  const m = d.getMonth();
  return m === 11 || m <= 1 ? "winter" : m >= 5 && m <= 7 ? "summer" : "mid";
}

/** Numbers inside a size ("104-110" → [104,110]); used to filter by height/size. */
export function sizeRange(s: string): [number, number] | null {
  const n = (s.match(/\d+/g) ?? []).map(Number);
  if (!n.length) return null;
  return [Math.min(...n), Math.max(...n)];
}
export function sizeMatches(size: string, q: string) {
  const qq = q.trim().toLowerCase();
  if (!qq) return true;
  const a = sizeRange(size), b = sizeRange(qq);
  if (a && b) return a[0] <= b[1] && b[0] <= a[1];
  return size.toLowerCase().includes(qq);
}

type C = { id: string; owner: string; layer: string; season: string; status: string };
/** Outfit from things in the closet for one person in this season: a dress OR top+bottom, plus shoes/outer if any. */
export function pickOutfit<T extends C>(all: T[], owner: string, season: string, rnd = Math.random): T[] {
  const ok = all.filter((c) => c.status === "closet" && (!owner || c.owner === owner) && (c.season === season || c.season === "all"));
  const one = (layer: string) => { const l = ok.filter((c) => c.layer === layer); return l.length ? l[Math.floor(rnd() * l.length)]! : null; };
  const dress = one("dress"), top = one("top"), bottom = one("bottom");
  const base = dress && (!top || !bottom || rnd() < 0.4) ? [dress] : [top, bottom];
  return [...base, one("shoes"), season === "summer" ? null : one("outer")].filter((x): x is T => !!x);
}
