import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import type { HouseholdData } from "@/lib/store";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { saveBox } from "@/lib/store";
import { suggestTag, autoTagColor, normTag, setTagColor, TAG_COLORS, tagColor, tagCounts } from "@/lib/tags";

const T = "Метки вещей · Топи Розитты";
const D = "Облако меток: чего в доме больше, чего меньше и в каких сундуках это лежит.";
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
  const guessable = d.items.filter((i) => !normTag(i.category) && (suggestTag(i.name) || i.kind === "book"));
  /** Fills empty tags in every chest from the thing's name; other fields are saved unchanged. */
  const autoTag = async () => {
    setBusy(true);
    try {
      const ids = [...new Set(guessable.map((i) => i.box_id))];
      for (const id of ids) {
        const b = d.boxes.find((x) => x.id === id);
        if (!b) continue;
        const items = d.items.filter((i) => i.box_id === id).map((i) => ({ name: i.name, kind: i.kind, author: i.author, needs_review: i.needs_review, category: normTag(i.category) ?? suggestTag(i.name) ?? (i.kind === "book" ? "Книги" : null) }));
        await saveBox({ data: { token, id, group_id: b.group_id, note: b.note ?? "", decide_by: b.decide_by, kid_size: b.kid_size, kid_season: b.kid_season, location: b.location, photos: b.photo_paths, items } });
      }
      await qc.invalidateQueries({ queryKey: ["household", token] });
      toast.success(`🪄 Метки расставлены: ${guessable.length}`);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const cloud = useMemo(() => tagCounts(d.items), [d.items]);
  const [open, setOpen] = useState<string | null>(null);
  const [, bump] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const color = (t: string) => (ready ? tagColor(t) : autoTagColor(t));
  const max = cloud[0]?.count ?? 1;
  const boxes = Object.fromEntries(d.boxes.map((b) => [b.id, b]));
  const groups = Object.fromEntries(d.groups.map((g) => [g.id, g]));
  const things = open ? d.items.filter((i) => normTag(i.category)?.toLowerCase() === open.toLowerCase()) : [];
  const untagged = d.items.filter((i) => !normTag(i.category)).length;

  return (
    <div className="space-y-4 pt-2">
      <h1 className="font-display text-xl text-primary">🏷️ Метки вещей</h1>
      <p className="text-base">Розитта сама ставит метку каждой вещи. Нажмите на метку — покажу, где такие вещи лежат.</p>
      {cloud.length === 0 ? (
        <p className="rounded-2xl bg-card p-4 text-muted-foreground">Меток пока нет. Они появятся у новых распознанных вещей, а старым Розитта подберёт метку сама.</p>
      ) : (
        <div className="flex flex-wrap gap-2 rounded-3xl bg-card p-4">
          {cloud.map(({ tag, count }) => (
            <button key={tag} type="button" onClick={() => setOpen(open === tag ? null : tag)} aria-pressed={open === tag}
              className={`rounded-full px-3 py-1 font-semibold text-background transition ${open === tag ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : ""}`}
              style={{ backgroundColor: color(tag), fontSize: `${0.85 + (count / max) * 0.65}rem` }}>
              {tag} · {count}
            </button>
          ))}
        </div>
      )}
      {untagged > 0 && <p className="text-sm text-muted-foreground">Без метки: {untagged} вещ.</p>}
      {guessable.length > 0 && <Button className="h-11 w-full" disabled={busy} onClick={autoTag}>🪄 {busy ? "Расставляю…" : `Расставить метки сама (${guessable.length})`}</Button>}

      {open && (
        <section className="space-y-3">
          <h2 className="font-semibold">{open}: {things.length}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Цвет:</span>
            {TAG_COLORS.map((c, i) => (
              <Button key={c} type="button" variant="ghost" size="icon" aria-label={`Цвет ${i + 1}`} aria-pressed={color(open) === c}
                className={`group-swatch h-8 w-8 rounded-full ${color(open) === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
                style={{ "--group-swatch": c } as CSSProperties} onClick={() => { setTagColor(open, c); bump((x) => x + 1); }} />
            ))}
          </div>
          {things.map((it) => {
            const b = boxes[it.box_id];
            const g = b?.group_id ? groups[b.group_id] : undefined;
            return (
              <Link key={it.id} to="/box/$id" params={{ id: it.box_id }} className="block rounded-2xl bg-card p-3">
                <span className="block text-base">{it.name}</span>
                <span className="block text-sm text-muted-foreground">
                  📍 {b?.location || "место не указано"} → сундук №{b?.number}{g ? ` (${g.icon} ${g.name})` : ""}
                </span>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
