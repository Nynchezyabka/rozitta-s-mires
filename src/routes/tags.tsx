import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import type { HouseholdData } from "@/lib/store";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { saveBox } from "@/lib/store";
import { categorizeItems } from "@/lib/store.functions";
import { categorizeWithKey, getAiKey, isAiConfigured } from "@/lib/ai-key";
import { TagChip } from "@/components/TagChip";
import { suggestTag, autoTagColor, normTag, setTagColor, TAG_COLORS, tagColor, tagCounts } from "@/lib/tags";

const T = "Вещи дома · Топи Розитты";
const D = "Все вещи дома: где каждая лежит, с фильтром по категориям.";
export const Route = createFileRoute("/tags")({
  head: () => ({ meta: [
    { title: T }, { name: "description", content: D }, { property: "og:title", content: T },
    { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <AppShell>{(d, t) => <Tags d={d} token={t} />}</AppShell>,
});

function Tags({ d, token }: { d: HouseholdData; token: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const untagged = d.items.filter((i) => !normTag(i.category));
  /** Dictionary first, then AI (own key or built-in) for the rest; saves every touched chest. */
  const autoTag = async () => {
    setBusy(true);
    try {
      const found: Record<string, string> = {};
      for (const i of untagged) { const g = i.kind === "book" ? null : suggestTag(i.name); if (g) found[i.name] = g; }
      const rest = [...new Set(untagged.filter((i) => !found[i.name]).map((i) => i.name))];
      if (rest.length) {
        const known = tagCounts(d.items).map((c) => c.tag);
        try {
          const ai = isAiConfigured() ? await categorizeWithKey(getAiKey(), rest, known) : await categorizeItems({ data: { token, names: rest, known } });
          for (const [n, c] of Object.entries(ai)) { const t = normTag(c); if (t) found[n] = t; }
        } catch (e) { toast.error((e as Error).message); }
      }
      const ids = [...new Set(untagged.filter((i) => found[i.name]).map((i) => i.box_id))];
      for (const id of ids) {
        const b = d.boxes.find((x) => x.id === id);
        if (!b) continue;
        const items = d.items.filter((i) => i.box_id === id).map((i) => ({ name: i.name, kind: i.kind, author: i.author, needs_review: i.needs_review, category: normTag(i.category) ?? found[i.name] ?? null }));
        await saveBox({ data: { token, id, revision: b.revision, group_id: b.group_id, note: b.note ?? "", decide_by: b.decide_by, kid_size: b.kid_size, kid_season: b.kid_season, location: b.location, photos: b.photo_paths, items } });
      }
      await qc.invalidateQueries({ queryKey: ["household", token] });
      const n = untagged.filter((i) => found[i.name]).length;
      if (n) toast.success(`🪄 Разложено по категориям: ${n} из ${untagged.length}`);
      else toast.error("Не удалось подобрать категории — выберите вручную");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const cloud = useMemo(() => tagCounts(d.items), [d.items]);
  const [open, setOpen] = useState<string | null>(null);
  const [, bump] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const color = (t: string) => (ready ? tagColor(t) : autoTagColor(t));
  const boxes = Object.fromEntries(d.boxes.map((b) => [b.id, b]));
  const groups = Object.fromEntries(d.groups.map((g) => [g.id, g]));
  const NONE = "__none";
  const ALL = "__all";
  const sel = open ?? ALL;
  const things = (sel === ALL ? d.items : sel === NONE ? d.items.filter((i) => !normTag(i.category)) : d.items.filter((i) => normTag(i.category)?.toLowerCase() === sel.toLowerCase()))
    .slice().sort((a, b) => a.name.localeCompare(b.name, "ru"));
  /** Sets one thing's tag by re-saving its chest with everything else unchanged. */
  const setTag = async (itemId: string, tag: string) => {
    const it = d.items.find((i) => i.id === itemId); const b = it && d.boxes.find((x) => x.id === it.box_id);
    if (!it || !b) return;
    try {
      const items = d.items.filter((i) => i.box_id === b.id).map((i) => ({ name: i.name, kind: i.kind, author: i.author, needs_review: i.needs_review, category: i.id === itemId ? tag : normTag(i.category) }));
      await saveBox({ data: { token, id: b.id, revision: b.revision, group_id: b.group_id, note: b.note ?? "", decide_by: b.decide_by, kid_size: b.kid_size, kid_season: b.kid_season, location: b.location, photos: b.photo_paths, items } });
      await qc.invalidateQueries({ queryKey: ["household", token] });
      toast.success(`🏷️ ${it.name}: ${tag}`);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-4 pt-2">
      <h1 className="font-display text-xl text-primary">📋 Вещи</h1>
      {d.items.length === 0 ? (
        <p className="rounded-2xl bg-card p-4 text-muted-foreground">Вещей пока нет. Добавьте сундук — и список появится здесь.</p>
      ) : (
        <div className="flex flex-wrap gap-2 rounded-3xl bg-card p-4">
          <button type="button" onClick={() => setOpen(ALL)} aria-pressed={sel === ALL}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${sel === ALL ? "border-primary bg-primary/20 text-foreground shadow-[0_0_12px_var(--primary)]" : "border-border bg-secondary text-secondary-foreground"}`}>
            ✨ Все вещи <span className="rounded-full bg-background/60 px-1.5 text-[0.7rem] text-muted-foreground">{d.items.length}</span>
          </button>
          {cloud.map(({ tag, count }) => (
            <TagChip key={tag} tag={tag} color={color(tag)} count={count} active={sel === tag} onClick={() => setOpen(tag)} />
          ))}
          {untagged.length > 0 && (
            <button type="button" onClick={() => setOpen(NONE)} aria-pressed={sel === NONE}
              className={`inline-flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground px-3 py-1.5 text-sm font-medium ${sel === NONE ? "bg-muted text-foreground" : "text-muted-foreground"}`}>
              ❔ Без категории <span className="rounded-full bg-background/60 px-1.5 text-[0.7rem]">{untagged.length}</span>
            </button>
          )}
        </div>
      )}
      {untagged.length > 0 && <Button className="h-11 w-full" disabled={busy} onClick={autoTag}>🪄 {busy ? "Расставляю…" : `Разложить по категориям с ИИ (${untagged.length})`}</Button>}

      {d.items.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">{sel === ALL ? "Все вещи" : sel === NONE ? "Без категории" : sel}: {things.length}</h2>
          {sel === NONE && <p className="text-sm text-muted-foreground">Розитта не узнала эти названия. Нажмите категорию под вещью — и готово.</p>}
          {sel !== NONE && sel !== ALL && <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Цвет:</span>
            {TAG_COLORS.map((c, i) => (
              <Button key={c} type="button" variant="ghost" size="icon" aria-label={`Цвет ${i + 1}`} aria-pressed={color(sel) === c}
                className={`group-swatch h-8 w-8 rounded-full ${color(sel) === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
                style={{ "--group-swatch": c } as CSSProperties} onClick={() => { setTagColor(sel, c); bump((x) => x + 1); }} />
            ))}
          </div>}
          {things.map((it) => {
            const b = boxes[it.box_id];
            const g = b?.group_id ? groups[b.group_id] : undefined;
            return (
              <div key={it.id} className="rounded-2xl bg-card p-3">
                <Link to="/box/$id" params={{ id: it.box_id }} className="block">
                  <span className="flex flex-wrap items-center gap-2 text-base">{it.kind === "book" ? "📖 " : ""}{it.name}{it.author && <span className="text-sm text-muted-foreground">— {it.author}</span>}{normTag(it.category) && <TagChip size="sm" tag={normTag(it.category)!} color={color(normTag(it.category)!)} />}</span>
                  <span className="block text-sm text-muted-foreground">
                    📍 {b?.location || "место не указано"} → сундук №{b?.number}{g ? ` (${g.icon} ${g.name})` : ""}
                  </span>
                </Link>
                {!normTag(it.category) && cloud.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {cloud.slice(0, 10).map(({ tag }) => (
                      <TagChip key={tag} size="sm" tag={tag} color={color(tag)} onClick={() => setTag(it.id, tag)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
