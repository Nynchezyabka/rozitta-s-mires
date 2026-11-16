import { getHousehold, saveBox, saveGroup, saveNote } from "./store";

export type Backup = {
  groups: { name: string; color: string; icon: string }[];
  boxes: { id: string; number: number; group_id: string | null; note: string | null; decide_by: string | null; kid_size: string | null; kid_season: string | null; location: string | null }[];
  items: { box_id: string; name: string; kind: string; author: string | null; needs_review: boolean }[];
  notes: { title: string; body: string }[];
  groupNames: Record<string, string>;
};

/** Читает файл «Полная копия (JSON)». Бросает понятную ошибку, если файл не наш. */
export function parseBackup(text: string): Backup {
  let j: any;
  try { j = JSON.parse(text); } catch { throw new Error("Это не файл копии — не читается как JSON"); }
  if (j?.app !== "rozittas-mires" || !Array.isArray(j.boxes) || !Array.isArray(j.items)) throw new Error("Это не копия Топей Розитты");
  const groups = Array.isArray(j.groups) ? j.groups : [];
  return {
    groups: groups.map((g: any) => ({ name: String(g.name), color: String(g.color ?? "#7cff3a"), icon: String(g.icon ?? "📦") })),
    groupNames: Object.fromEntries(groups.map((g: any) => [g.id, String(g.name)])),
    boxes: j.boxes,
    items: j.items.filter((i: any) => i && typeof i.name === "string"),
    notes: Array.isArray(j.notes) ? j.notes.filter((n: any) => n && typeof n.title === "string") : [],
  };
}

/** Добавляет вещи из копии в текущий дом. Ничего существующего не удаляет. */
export async function applyBackup(token: string, b: Backup, onStep?: (done: number, total: number) => void) {
  const cur = await getHousehold({ data: { token } });
  const have = new Set(cur.groups.map((g) => g.name.toLowerCase()));
  for (const g of b.groups) if (!have.has(g.name.toLowerCase())) { await saveGroup({ data: { token, ...g } }); have.add(g.name.toLowerCase()); }
  const fresh = await getHousehold({ data: { token } });
  const byName = Object.fromEntries(fresh.groups.map((g) => [g.name.toLowerCase(), g.id]));
  const total = b.boxes.length + b.notes.length;
  let done = 0;
  for (const box of [...b.boxes].sort((x, y) => x.number - y.number)) {
    const gname = box.group_id ? b.groupNames[box.group_id] : undefined;
    await saveBox({ data: {
      token, group_id: gname ? byName[gname.toLowerCase()] ?? null : null, note: box.note ?? undefined, decide_by: box.decide_by,
      kid_size: box.kid_size, kid_season: box.kid_season, location: box.location,
      items: b.items.filter((i) => i.box_id === box.id).map(({ name, kind, author, needs_review }) => ({ name, kind, author, needs_review })),
    } });
    onStep?.(++done, total);
  }
  for (const n of b.notes) { await saveNote({ data: { token, title: n.title, body: n.body } }); onStep?.(++done, total); }
}
