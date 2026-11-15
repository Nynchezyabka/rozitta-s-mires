import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { spaceByKey, ago, type Space } from "@/lib/spaces";
import { deleteThing, markThing, saveThing } from "@/lib/store";
import { thingsQuery } from "./house";
import { sfx } from "@/lib/rozitta";

const T = "Место в доме — Тайные Хроники Топей Розитты";
const D = "Список вещей в одном месте дома: шкаф, холодильник, книги или растения.";
export const Route = createFileRoute("/house/$space")({
  head: () => ({ meta: [
    { title: T }, { name: "description", content: D }, { property: "og:title", content: T },
    { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => {
    const { space } = Route.useParams();
    const s = spaceByKey(space);
    return <AppShell>{(_, t) => (s ? <SpacePage s={s} token={t} /> : <p className="py-10 text-center">Такого места нет 🐸</p>)}</AppShell>;
  },
});

function SpacePage({ s, token }: { s: Space; token: string }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery(thingsQuery(token));
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
    <div className="space-y-4 pt-2">
      <Link to="/house" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Весь дом</Link>
      <div className="flex items-center gap-3">
        <img src={s.img} alt="" className="pixel h-20 w-20 shrink-0 object-contain" />
        <div className="min-w-0">
          <h1 className="font-display text-base leading-snug text-primary">{s.title}</h1>
          <p className="text-sm text-muted-foreground">{s.hint}</p>
        </div>
      </div>
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
          <li key={x.id} className="rounded-2xl bg-card p-3">
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
