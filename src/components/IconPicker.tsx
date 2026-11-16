import { ALL_ICONS, ICON_CATEGORIES, suggestIcons } from "@/lib/icons";

/** Suggested icons for the typed name + full catalog by category. */
export function IconPicker({ name, value, onChange }: { name: string; value: string; onChange: (i: string) => void }) {
  const sug = suggestIcons(name);
  const btn = (i: string) => (
    <button key={i} type="button" onClick={() => onChange(i)} aria-label={`Значок ${i}`} className={`h-11 w-11 rounded-xl bg-card text-xl ${value === i ? "ring-2 ring-primary" : ""}`}>{i}</button>
  );
  return (
    <div className="space-y-3">
      {sug.length > 0 && (
        <div className="rounded-2xl border-2 border-primary/50 bg-primary/10 p-3">
          <p className="mb-2 text-sm font-medium">🐸 Розитта предлагает</p>
          <div className="flex flex-wrap gap-2">{sug.map(btn)}</div>
        </div>
      )}
      {ICON_CATEGORIES.map((c) => (
        <div key={c.name}>
          <p className="mb-1 text-xs text-muted-foreground">{c.name}</p>
          <div className="flex flex-wrap gap-2">{c.icons.map(btn)}</div>
        </div>
      ))}
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        Свой значок:
        <input value={ALL_ICONS.includes(value) ? "" : value} onChange={(e) => e.target.value && onChange([...e.target.value].slice(-2).join(""))} placeholder="вставьте эмодзи" className="h-10 w-32 rounded-xl border border-input bg-background px-2 text-lg" />
      </label>
    </div>
  );
}
