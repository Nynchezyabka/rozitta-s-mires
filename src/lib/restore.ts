import { getHousehold, saveBox, saveGroup, saveNote, type HouseholdData } from "./store";
import { DEVICE_KEYS } from "./backup";

export type Backup = {
  groups: { name: string; color: string; icon: string }[];
  boxes: { id: string; number: number; group_id: string | null; note: string | null; decide_by: string | null; kid_size: string | null; kid_season: string | null; location: string | null }[];
  items: { box_id: string; name: string; kind: string; author: string | null; needs_review: boolean }[];
  notes: { title: string; body: string }[];
  groupNames: Record<string, string>;
  device?: Record<string, string>;
};

export type RestorePlan = { add: Backup["boxes"]; same: number; conflicts: number[]; notes: Backup["notes"] };

/** What a restore will do: boxes already here (same id) are skipped; a number taken by another chest is a conflict. */
export function planRestore(cur: Pick<HouseholdData, "boxes" | "notes">, b: Backup): RestorePlan {
  const ids = new Set(cur.boxes.map((x) => x.id));
  const byNum = new Map(cur.boxes.map((x) => [x.number, x.id]));
  const add: Backup["boxes"] = [], conflicts: number[] = [];
  let same = 0;
  for (const box of b.boxes) {
    if (ids.has(box.id)) same++;
    else if (byNum.has(box.number)) conflicts.push(box.number);
    else add.push(box);
  }
  const have = new Set(cur.notes.map((n) => `${n.title}\n${n.body}`));
  return { add, same, conflicts: conflicts.sort((x, y) => x - y), notes: b.notes.filter((n) => !have.has(`${n.title}\n${n.body}`)) };
}

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
    ...(j.device && typeof j.device === "object" ? { device: Object.fromEntries(Object.entries(j.device).filter(([k, v]) => (DEVICE_KEYS as readonly string[]).includes(k) && typeof v === "string")) as Record<string, string> } : {}),
  };
}

/** Возвращает сундуки из копии с прежними номерами и id (старые QR работают). Повтор не создаёт дублей. Ничего существующего не удаляет. */
export async function applyBackup(token: string, b: Backup, onStep?: (done: number, total: number) => void, withDevice = false) {
  const cur = await getHousehold({ data: { token } });
  const plan = planRestore(cur, b);
  if (plan.conflicts.length) throw new Error(`Номера ${plan.conflicts.join(", ")} уже заняты в этом доме другими сундуками — восстановление не начато`);
  const have = new Set(cur.groups.map((g) => g.name.toLowerCase()));
  for (const g of b.groups) if (!have.has(g.name.toLowerCase())) { await saveGroup({ data: { token, ...g } }); have.add(g.name.toLowerCase()); }
  const fresh = await getHousehold({ data: { token } });
  const byName = Object.fromEntries(fresh.groups.map((g) => [g.name.toLowerCase(), g.id]));
  const total = plan.add.length + plan.notes.length;
  let done = 0;
  for (const box of [...plan.add].sort((x, y) => x.number - y.number)) {
    const gname = box.group_id ? b.groupNames[box.group_id] : undefined;
    await saveBox({ data: {
      token, id: box.id, number: box.number, restore: true,
      group_id: gname ? byName[gname.toLowerCase()] ?? null : null, ...(box.note ? { note: box.note } : {}), decide_by: box.decide_by,
      kid_size: box.kid_size, kid_season: box.kid_season, location: box.location,
      items: b.items.filter((i) => i.box_id === box.id).map(({ name, kind, author, needs_review }) => ({ name, kind, author, needs_review })),
    } });
    onStep?.(++done, total);
  }
  for (const n of plan.notes) { await saveNote({ data: { token, title: n.title, body: n.body } }); onStep?.(++done, total); }
  if (withDevice && b.device) for (const [k, v] of Object.entries(b.device)) localStorage.setItem(k, v);
  return plan;
}
