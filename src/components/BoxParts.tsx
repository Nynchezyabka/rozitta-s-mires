import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { HouseholdData } from "@/lib/household";

export type EditItem = { name: string; kind: "item" | "book"; author: string | null; needs_review: boolean };

export function ItemsEditor({ items, onChange }: { items: EditItem[]; onChange: (i: EditItem[]) => void }) {
  const set = (i: number, patch: Partial<EditItem>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
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
          {it.needs_review && (
            <button onClick={() => set(i, { needs_review: false })} className="ml-8 mt-1 rounded-full bg-warning/40 px-2.5 py-0.5 text-xs">
              проверить · нажмите, если всё верно
            </button>
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <Button variant="outline" className="h-11 flex-1" onClick={() => onChange([...items, { name: "", kind: "item", author: null, needs_review: false }])}>
          <Plus className="h-4 w-4" /> Вещь
        </Button>
        <Button variant="outline" className="h-11 flex-1" onClick={() => onChange([...items, { name: "", kind: "book", author: "", needs_review: false }])}>
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
