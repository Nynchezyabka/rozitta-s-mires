import type { HouseholdData } from "./store";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One row per item: box number, group, location, item name, author. */
export function toCsv(d: HouseholdData): string {
  const boxes = Object.fromEntries(d.boxes.map((b) => [b.id, b]));
  const groups = Object.fromEntries(d.groups.map((g) => [g.id, g.name]));
  const rows = [["Сундук", "Группа", "Где стоит", "Название", "Автор"]];
  const items = [...d.items].sort((a, b) => (boxes[a.box_id]?.number ?? 0) - (boxes[b.box_id]?.number ?? 0));
  for (const it of items) {
    const b = boxes[it.box_id];
    if (!b) continue;
    rows.push([String(b.number), groups[b.group_id ?? ""] ?? "", b.location ?? "", it.name, it.author ?? ""]);
  }
  return "\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

/** Settings on this device that may travel with the copy. The AI key never does. */
export const DEVICE_KEYS = ["rozitta-garden", "rozitta-garden-log", "rozitta-potager", "rozitta-health"] as const;
export const readDevice = (): Record<string, string> =>
  Object.fromEntries(DEVICE_KEYS.map((k) => [k, localStorage.getItem(k)]).filter((e): e is [string, string] => e[1] != null));

export function toJson(d: HouseholdData, device?: Record<string, string>): string {
  const boxes = d.boxes.map(({ photo_url: _u, photo_urls: _us, ...b }) => b);
  return JSON.stringify({ app: "rozittas-mires", exported_at: new Date().toISOString(), household: d.household, groups: d.groups, boxes, items: d.items, notes: d.notes, ...(device ? { device } : {}) }, null, 2);
}

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
