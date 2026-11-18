import { useEffect, useState } from "react";
import { ROOMS, DEFAULT_ROOMS, getShownRooms } from "@/lib/rooms";
import { X, Plus, Check } from "lucide-react";
import { TagChip } from "@/components/TagChip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { HouseholdData } from "@/lib/household";
import { normTag, suggestTag, tagColor, tagCounts } from "@/lib/tags";

export type EditItem = { name: string; kind: "item" | "book"; author: string | null; needs_review: boolean; category: string | null };

const BASE_TAGS = ["Одежда", "Текстиль", "Посуда", "Декор", "Книги", "Документы", "Игрушки", "Инструменты", "Электроника", "Праздник"];

/** Category row: confirmed chip, or Rozitta's guess with ✓/✕, or quick chips of known categories. */
function CategoryRow({ it, known, onSet }: { it: EditItem; known: string[]; onSet: (c: string | null) => void }) {
  const [rejected, setRejected] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const cat = normTag(it.category);
  const guess = !cat && it.name.trim() ? (suggestTag(it.name) ?? (it.kind === "book" ? "Книги" : null)) : null;
  const showGuess = guess && guess !== rejected;
  if (cat) return (
    <div className="ml-8 mt-1.5 flex items-center gap-2">
      <TagChip size="sm" tag={cat} color={tagColor(cat)}>
        <button type="button" onClick={() => onSet(null)} aria-label="Убрать категорию" className="-mr-1 ml-0.5 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
      </TagChip>
    </div>
  );
  if (!it.name.trim()) return null;
  if (showGuess) return (
    <div className="ml-8 mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>💡 Розитта предлагает</span>
      <TagChip size="sm" tag={guess} color={tagColor(guess)} />
      <button type="button" onClick={() => onSet(guess)} className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 font-semibold text-primary-foreground"><Check className="h-3 w-3" /> Да</button>
      <button type="button" onClick={() => setRejected(guess)} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 font-semibold text-secondary-foreground"><X className="h-3 w-3" /> Другая</button>
    </div>
  );
  const opts = [...new Set([...known, ...BASE_TAGS])].filter((t) => t !== rejected).slice(0, 12);
  return (
    <div className="ml-8 mt-1.5 space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {opts.map((t) => <TagChip key={t} size="sm" tag={t} color={tagColor(t)} onClick={() => onSet(t)} />)}
        <button type="button" onClick={() => setTyping(true)} className="rounded-full border border-dashed border-muted-foreground px-2 py-0.5 text-xs text-muted-foreground">+ своя</button>
      </div>
      {typing && (
        <Input autoFocus placeholder="Своя категория и Enter" aria-label="Своя категория" className="h-8 text-sm"
          onKeyDown={(e) => { const v = (e.target as HTMLInputElement).value.trim(); if (e.key === "Enter" && v) { onSet(v); setTyping(false); } }}
          onBlur={(e) => { const v = e.target.value.trim(); if (v) onSet(v); setTyping(false); }} />
      )}
    </div>
  );
}

export function ItemsEditor({ items, onChange }: { items: EditItem[]; onChange: (i: EditItem[]) => void }) {
  const set = (i: number, patch: Partial<EditItem>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const known = tagCounts(items).map((t) => t.tag);
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className={`rounded-2xl bg-card p-2 ${it.needs_review ? "ring-2 ring-warning" : ""}`}>
          <div className="flex items-center gap-2">
            <span className="w-6 text-center">{it.kind === "book" ? "📖" : "•"}</span>
            <Input value={it.name} onChange={(e) => set(i, { name: e.target.value })} className="h-11 border-0 bg-transparent text-base shadow-none" placeholder={it.kind === "book" ? "Название" : "Вещь"} />
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-2 text-muted-foreground" aria-label="Удалить">
              <X className="h-5 w-5" />
            </button>
          </div>
          {it.kind === "book" && (
            <Input value={it.author ?? ""} onChange={(e) => set(i, { author: e.target.value })} placeholder="Автор" className="ml-8 h-9 w-[calc(100%-2rem)] border-0 bg-muted/60 text-sm shadow-none" />
          )}
          <CategoryRow it={it} known={known} onSet={(c) => set(i, { category: c })} />
          {it.needs_review && (
            <button onClick={() => set(i, { needs_review: false })} className="ml-8 mt-1 rounded-full bg-warning/40 px-2.5 py-0.5 text-xs">
              проверить · нажмите, если всё верно
            </button>
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <Button variant="outline" className="h-11 flex-1" onClick={() => onChange([...items, { name: "", kind: "item", author: null, needs_review: false, category: null }])}>
          <Plus className="h-4 w-4" /> Вещь
        </Button>
        <Button variant="outline" className="h-11 flex-1" onClick={() => onChange([...items, { name: "", kind: "book", author: "", needs_review: false, category: null }])}>
          <Plus className="h-4 w-4" /> Книга
        </Button>
      </div>
    </div>
  );
}

export function GroupPicker({ groups, value, onChange }: { groups: HouseholdData["groups"]; value: string | null; onChange: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {groups.map((g) => (
        <button
          key={g.id}
          onClick={() => onChange(g.id)}
          className={`flex items-center gap-2 rounded-2xl border-2 bg-card p-3 text-left ${value === g.id ? "border-primary" : "border-transparent"}`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg" style={{ backgroundColor: g.color }}>
            {g.icon}
          </span>
          <span className="text-sm font-medium leading-tight">{g.name}</span>
        </button>
      ))}
    </div>
  );
}

export const isLater = (g?: { name: string } | null) => !!g && g.name.toLowerCase().includes("позже");

export const isKids = (g?: { name: string } | null) => !!g && g.name.toLowerCase().includes("детск");
export const KID_SIZES = ["0–1 год", "1–2 года", "2–4 года", "4–6 лет", "6–8 лет", "8–10 лет", "10+ лет"];
export const KID_SEASONS = ["Лето", "Демисезон", "Зима", "Всесезон"];

export function KidsPicker({ size, season, onSize, onSeason }: { size: string; season: string; onSize: (v: string) => void; onSeason: (v: string) => void }) {
  const row = (opts: string[], val: string, set: (v: string) => void) => (
    <div className="flex flex-wrap gap-2">
      {opts.map((o) => (
        <button key={o} type="button" onClick={() => set(val === o ? "" : o)} className={`rounded-full px-3 py-1.5 text-sm font-medium ${val === o ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
          {o}
        </button>
      ))}
    </div>
  );
  return (
    <div className="space-y-3 rounded-2xl bg-card p-4">
      <p className="text-sm font-medium">Размер / возраст</p>
      {row(KID_SIZES, size, onSize)}
      <p className="text-sm font-medium">Сезон</p>
      {row(KID_SEASONS, season, onSeason)}
    </div>
  );
}

/** Distinct places, most used first. */
export function byFrequency(known: (string | null)[]): string[] {
  const c = new Map<string, number>();
  for (const x of known) { const v = x?.trim(); if (v) c.set(v, (c.get(v) ?? 0) + 1); }
  return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru")).map(([k]) => k);
}

/** "Где стоит" with suggestions from places already used in this household. */
export function LocationInput({ value, onChange, known }: { value: string; onChange: (v: string) => void; known: (string | null)[] }) {
  const opts = byFrequency(known);
  const [shown, setShown] = useState<string[]>(DEFAULT_ROOMS);
  useEffect(() => setShown(getShownRooms()), []);
  const rooms = ROOMS.filter((r) => r.key !== "other" && shown.includes(r.key));
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Комната — одним нажатием, уточнение можно дописать:</p>
      <div className="flex flex-wrap gap-1.5">
        {rooms.map((r) => (
          <button type="button" key={r.key} onClick={() => onChange(r.title)} className={`rounded-full px-3 py-1.5 text-sm ${value === r.title ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{r.icon} {r.title}</button>
        ))}
      </div>
      <input list="known-places" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Балкон, шкаф в коридоре, дача…"
        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-base" />
      <datalist id="known-places">{opts.map((o) => <option key={o} value={o} />)}</datalist>
      {opts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {opts.slice(0, 8).map((o) => (
            <button type="button" key={o} onClick={() => onChange(o)} className={`rounded-full px-3 py-1 text-xs ${value === o ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>📍 {o}</button>
          ))}
        </div>
      )}
    </div>
  );
}
