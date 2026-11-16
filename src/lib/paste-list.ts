/** "Вставить список": turn text copied from any AI chat into items. Pure, no network. */
export type PastedItem = { name: string; author: string | null };

import { getHealth, medsPrompt } from "./health";

export function pastePrompt(mode: "box" | "books" | "meds") {
  if (mode === "meds") return medsPrompt(getHealth(), true);
  return mode === "books"
    ? 'Перечисли книги на фото. Для каждой книги напиши "Название — Автор", по одной на строку, без нумерации и пояснений.'
    : 'Перечисли вещи на фото коротко по-русски, по одной на строку, без нумерации и пояснений. Однотипные объединяй: "Полотенца, 4 шт". Не больше 25 строк.';
}

export function parsePasted(text: string, mode: "box" | "books" | "meds"): { items: PastedItem[]; duplicates: string[] } {
  const items: PastedItem[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw
      .replace(/^\s*(?:[-•*–—·]+|\d+[.)])\s*/, "")
      .replace(/\*\*/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!line) continue;
    if (mode === "books") {
      const m = line.match(/^(.+?)\s+[—–-]\s+(.+)$/);
      items.push(m ? { name: m[1]!.trim(), author: m[2]!.trim() } : { name: line, author: null });
    } else items.push({ name: line, author: null });
  }
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const i of items) {
    const k = i.name.toLowerCase();
    if (seen.has(k)) dup.add(i.name);
    seen.add(k);
  }
  return { items, duplicates: [...dup] };
}
