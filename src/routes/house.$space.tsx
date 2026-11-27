import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { spaceByKey, ago, type Space } from "@/lib/spaces";
import { roomByKey, inRoom, type Room } from "@/lib/rooms";
import type { HouseholdData } from "@/lib/household";
import { Plus } from "lucide-react";
import { deleteThing, markThing, saveThing } from "@/lib/store";
import { thingsQuery } from "./house";
import { sfx } from "@/lib/rozitta";

const T = "Место в доме · Топи Розитты";
const D = "Сундуки в одной комнате дома и быстрые заметки.";
export const Route = createFileRoute("/house/$space")({
  head: () => ({ meta: [
    { title: T }, { name: "description", content: D }, { property: "og:title", content: T },
    { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => {
    const { space } = Route.useParams();
    const r = roomByKey(space);
    return <AppShell>{(d, t) => (r ? <RoomPage r={r} d={d} token={t} /> : <p className="py-10 text-center">Такого места нет 🐸</p>)}</AppShell>;
  },
});

function RoomPage({ r, d, token }: { r: Room; d: HouseholdData; token: string }) {
  const boxes = inRoom(r, d.boxes);
  const notes = r.notes ? spaceByKey(r.notes) : undefined;
  const group = (id: string | null) => d.groups.find((g) => g.id === id);
  return (
    <div className="space-y-4 pt-2">
      <Link to="/house" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Все комнаты</Link>
      <div className="flex items-center gap-3">
        {r.img ? <img src={r.img} alt="" className="pixel h-20 w-20 shrink-0 object-contain" /> : <span className="text-5xl" aria-hidden>{r.icon}</span>}
        <div className="min-w-0">
          <h1 className="font-display text-base leading-snug text-primary">{r.title}</h1>
          <p className="text-sm text-muted-foreground">{r.hint}</p>
        </div>
      </div>
      <section className="space-y-2">
        <h2 className="font-semibold">Сундуки здесь</h2>
        {boxes.map((b) => (
          <Link key={b.id} to="/box/$id" params={{ id: b.id }} className="flex items-center gap-3 rounded-2xl bg-card p-3">
            <span className="text-2xl" aria-hidden>{group(b.group_id)?.icon ?? "📦"}</span>
            <span className="min-w-0 flex-1"><span className="block font-semibold">№{b.number} · {group(b.group_id)?.name ?? "Без группы"}</span><span className="block truncate text-xs text-muted-foreground">{b.location || "место не указано"}</span></span>
          </Link>
        ))}
        {!boxes.length && <p className="text-sm text-muted-foreground">Пока нет. {r.words[0] ? `Напишите в «Где стоит», например, «${r.title}».` : ""}</p>}
        {r.key !== "other" && <Button asChild variant="outline" className="h-11 w-full"><Link to="/new" search={{ place: r.title }}><Plus />Новый сундук сюда</Link></Button>}
      </section>
      {notes && <section className="space-y-2 border-t border-border pt-4"><h2 className="font-semibold">Быстрые заметки без сундука</h2><SpacePage s={notes} token={token} /></section>}
    </div>
  );
}

function SpacePage({ s, token }: { s: Space; token: string }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery(thingsQuery(token));
  const hash = useLocation({ select: (location) => location.hash });
  useEffect(() => {
    const id = hash.replace(/^#/, "");
    if (!id.startsWith("quick-note-")) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(id);
      target?.scrollIntoView({ block: "center" });
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [data, hash]);
  const list = data.filter((x) => x.space === s.key);
  const [title, setTitle] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["things", token] });
  const add = async (t: string) => {
    if (!t.trim()) return;
    try { await saveThing({ data: { token, space: s.key, title: t.trim() } }); setTitle(""); sfx.bubble(); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const mark = async (id: string, kind: "water" | "feed") => {
    await markThing({ data: { token, id, kind } }); sfx.bubble(); refresh();
    toast.success(kind === "water" ? "💧 Полито сегодня" : "🌱 Удобрено сегодня");
  };
  const del = async (id: string) => { await deleteThing({ data: { token, id } }); refresh(); };
  const unused = s.starter.filter((x) => !list.some((l) => l.title.toLowerCase() === x.toLowerCase()));
  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); add(title); }} className="flex gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={s.plants ? "Название растения" : "Что здесь лежит?"} />
        <Button type="submit">Добавить</Button>
      </form>
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="w-full text-xs text-muted-foreground">Подсказки в один тап:</span>
          {unused.map((x) => <button key={x} onClick={() => add(x)} className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">+ {x}</button>)}
        </div>
      )}
      <ul className="space-y-2">
        {list.map((x) => (
          <li key={x.id} id={`quick-note-${x.id}`} tabIndex={-1} className={`scroll-mt-24 rounded-2xl bg-card p-3 ${hash.replace(/^#/, "") === `quick-note-${x.id}` ? "ring-2 ring-primary" : ""}`}>
            <div className="flex items-center gap-2">
              <span className="flex-1 font-semibold">{x.title}</span>
              <button aria-label="Удалить" onClick={() => del(x.id)} className="text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
            </div>
            {s.plants && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <Button size="sm" variant="secondary" onClick={() => mark(x.id, "water")}>💧 Полила · {ago(x.watered_at)}</Button>
                <Button size="sm" variant="secondary" onClick={() => mark(x.id, "feed")}>🌱 Удобрила · {ago(x.fed_at)}</Button>
              </div>
            )}
          </li>
        ))}
        {!list.length && <li className="py-6 text-center text-sm text-muted-foreground">Пока пусто. Розитта ждёт первую запись 🐸</li>}
      </ul>
    </div>
  );
}
