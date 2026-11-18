/** Which chests already had stickers printed on this device. */
const KEY = "rozitta-printed";
export function getPrinted(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]); } catch { return new Set(); }
}
export function markPrinted(ids: string[]): Set<string> {
  const s = getPrinted();
  ids.forEach((i) => s.add(i));
  try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch { /* ignore */ }
  return s;
}
