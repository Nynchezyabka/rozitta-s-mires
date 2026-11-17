import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ROOMS, DEFAULT_ROOMS, getShownRooms, setShownRooms, inRoom } from "@/lib/rooms";
import { getThings } from "@/lib/store";
import type { HouseholdData } from "@/lib/household";

const T = "Дом · Топи Розитты";
const D = "Комнаты дома: какие сундуки стоят в фонотеке, мастерской, детской или гараже.";
export const Route = createFileRoute("/house")({
  head: () => ({ meta: [
    { title: T }, { name: "description", content: D }, { property: "og:title", content: T },
    { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: HouseLayout,
});

function HouseLayout() {
  const m = useMatchRoute();
  if (m({ to: "/house/$space" })) return <Outlet />;
  return <AppShell>{(d) => <House d={d} />}</AppShell>;
}

export const thingsQuery = (token: string) => ({ queryKey: ["things", token], queryFn: () => getThings({ data: { token } }) });

function House({ d }: { d: HouseholdData }) {
  const [shown, setShown] = useState<string[]>(DEFAULT_ROOMS);
  const [edit, setEdit] = useState(false);
  useEffect(() => setShown(getShownRooms()), []);
  const toggle = (k: string) => { const next = shown.includes(k) ? shown.filter((x) => x !== k) : [...shown, k]; setShown(next); setShownRooms(next); };
  const rooms = edit ? ROOMS : ROOMS.filter((r) => shown.includes(r.key) || r.key === "other");
  return (
    <div className="space-y-4 pt-2">
      <Link to="/tags" className="flex items-center gap-3 rounded-2xl border-2 border-accent/50 bg-card p-3">
        <span className="text-3xl" aria-hidden>🏷️</span>
        <span className="flex-1"><span className="block font-semibold">Метки вещей</span><span className="text-sm text-muted-foreground">Чего в доме больше и где оно лежит</span></span>
      </Link>
      <h1 className="font-display text-xl text-primary">🏚 Комнаты дома</h1>
      <p className="text-base text-foreground">{edit ? "Отметьте комнаты, которые есть у вас. Лишние спрячутся." : "Сундук попадает в комнату по полю «Где стоит»."}</p>
      <Button variant={edit ? "default" : "outline"} className="h-11 w-full" onClick={() => setEdit(!edit)}><Settings2 />{edit ? "Готово" : "Мои комнаты: выбрать"}</Button>
      <div className="grid grid-cols-2 gap-3">
        {rooms.map((r) => {
          const n = inRoom(r, d.boxes).length;
          const on = shown.includes(r.key) || r.key === "other";
          const body = (
            <>
              {r.img ? <img src={r.img} alt="" loading="lazy" className="pixel h-20 w-20 object-contain" /> : <span className="flex h-20 items-center text-5xl" aria-hidden>{r.icon}</span>}
              <span className="text-sm font-semibold">{r.title}</span>
              <span className="text-xs text-muted-foreground">{edit ? (on ? "✓ показывать" : "скрыта") : n ? `${n} сундук.` : r.hint}</span>
            </>
          );
          const cls = `flex flex-col items-center gap-1 rounded-2xl border-2 bg-card p-3 text-center transition ${edit && !on ? "border-muted opacity-50" : "border-primary/40 hover:border-accent"}`;
          return edit
            ? <button key={r.key} type="button" disabled={r.key === "other"} aria-pressed={on} onClick={() => toggle(r.key)} className={cls}>{body}</button>
            : <Link key={r.key} to="/house/$space" params={{ space: r.key }} className={cls}>{body}</Link>;
        })}
      </div>
    </div>
  );
}
