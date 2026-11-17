import { tagColor } from "@/lib/tags";
import { DueBadge, LocationPath } from "@/components/BoxBits";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Plus, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { GroupChip } from "@/components/GroupChip";
import { Input } from "@/components/ui/input";
import { RozittaBubble } from "@/components/RozittaBubble";
import type { HouseholdData } from "@/lib/household";
import cabbage from "@/assets/cabbage.webp";
import rozitta from "@/assets/rozitta.webp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Тайные Хроники Топей Розитты — что в каком сундуке" },
      { name: "description", content: "Волшебная опись всего дома: сундуки, шкафы, книги, растения. Фото — и Розитта сама запишет, что внутри." },
      { property: "og:title", content: "Тайные Хроники Топей Розитты — что в каком сундуке" },
      { property: "og:description", content: "Волшебная опись всего дома: сундуки, шкафы, книги, растения. Фото — и Розитта сама запишет, что внутри." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AppShell>{(d) => <Home d={d} />}</AppShell>,
});

function Home({ d }: { d: HouseholdData }) {
  const [q, setQ] = useState("");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const gmap = useMemo(() => Object.fromEntries(d.groups.map((g) => [g.id, g])), [d.groups]);
  const itemsByBox = useMemo(() => {
    const m: Record<string, typeof d.items> = {};
    for (const it of d.items) (m[it.box_id] ??= []).push(it);
    return m;
  }, [d.items]);
  const query = q.trim().toLowerCase();
  const hits = query
    ? d.items.filter((it) => it.name.toLowerCase().includes(query) || (it.author ?? "").toLowerCase().includes(query) || (it.category ?? "").toLowerCase().includes(query))
    : [];
  const boxes = d.boxes.filter((b) => {
    if (groupFilter && b.group_id !== groupFilter) return false;
    if (!query) return true;
    return String(b.number) === query || `${b.note ?? ""} ${b.kid_size ?? ""} ${b.kid_season ?? ""} ${b.location ?? ""}`.toLowerCase().includes(query) || (gmap[b.group_id ?? ""]?.name ?? "").toLowerCase().includes(query);
  });
  const boxById = Object.fromEntries(d.boxes.map((b) => [b.id, b]));
  const today = new Date().toISOString().slice(0, 10);
  const overdue = d.boxes.filter((b) => b.decide_by && b.decide_by <= today);

  return (
    <div className="space-y-5 pt-2">
      <RozittaBubble />
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Где мои… (вещь, номер сундука)" className="h-14 rounded-2xl bg-card pl-12 text-base" />
      </div>

      {query && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Вещи: {hits.length}</h2>
          {hits.slice(0, 30).map((it) => {
            const b = boxById[it.box_id];
            return (
              <Link key={it.id} to="/box/$id" params={{ id: it.box_id }} className="flex items-center justify-between rounded-2xl bg-card p-3">
                <span>
                  {it.kind === "book" ? "📖 " : ""}
                  {it.name}
                  {it.author && <span className="text-muted-foreground"> — {it.author}</span>}
                  {it.category && <span className="ml-2 rounded-full px-2 py-0.5 text-xs text-background" style={{ backgroundColor: tagColor(it.category) }}>{it.category}</span>}
                </span>
                <span className="font-display text-lg font-bold">№{b?.number}</span>
              </Link>
            );
          })}
        </section>
      )}

      {!query && overdue.length > 0 && (
        <div className="flex items-center gap-2 rounded-2xl bg-warning/30 p-3 text-sm">
          <AlertCircle className="h-5 w-5" /> Пора решить: сундуки {overdue.map((b) => "№" + b.number).join(", ")}
        </div>
      )}

      {!query && d.boxes.length === 0 && (
        <Link to="/new" className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-primary/40 bg-card p-10 text-center">
          <img src={rozitta} alt="" className="pixel bob h-28 w-28" />
          <span className="font-display text-sm leading-relaxed text-primary">Первый сундук</span>
          <span className="text-muted-foreground">Розитта ждёт: сфотографируйте открытый сундук — она сама разберёт, что внутри</span>
        </Link>
      )}

      {query && hits.length === 0 && boxes.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
          <img src={cabbage} alt="" className="pixel h-16 w-16" />
          Розитта перерыла всё болото — такого нет
        </div>
      )}

      {d.boxes.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setGroupFilter(null)} className={`shrink-0 rounded-full px-3 py-1 text-sm ${!groupFilter ? "bg-foreground text-background" : "bg-card"}`}>
            Все · {d.boxes.length}
          </button>
          {d.groups.map((g) => {
            const n = d.boxes.filter((b) => b.group_id === g.id).length;
            if (!n) return null;
            return (
              <button key={g.id} onClick={() => setGroupFilter(g.id)} className={`shrink-0 rounded-full px-3 py-1 text-sm ${groupFilter === g.id ? "bg-foreground text-background" : "bg-card"}`}>
                {g.icon} {g.name} · {n}
              </button>
            );
          })}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {boxes.map((b) => {
          const g = gmap[b.group_id ?? ""];
          const its = itemsByBox[b.id] ?? [];
          return (
            <Link key={b.id} to="/box/$id" params={{ id: b.id }} className="overflow-hidden rounded-2xl bg-card shadow-sm">
              <div className="h-2" style={{ backgroundColor: g?.color ?? "transparent" }} />
              {b.photo_url ? <img src={b.photo_url} alt="" className="aspect-[4/3] w-full object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center bg-muted text-4xl">{g?.icon ?? "🐸"}</div>}
              <div className="space-y-1 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-2xl font-bold">№{b.number}</span>
                  {its.some((i) => i.needs_review) && <span className="rounded bg-warning/40 px-1.5 text-xs">проверить</span>}
                </div>
                <GroupChip g={g} />
                <LocationPath value={b.location} />
                <DueBadge date={b.decide_by} />
                <p className="line-clamp-2 text-sm text-muted-foreground">{its.map((i) => i.name).join(", ") || "Пусто"}</p>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
