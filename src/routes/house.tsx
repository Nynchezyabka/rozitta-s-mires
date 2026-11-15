import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { SPACES } from "@/lib/spaces";
import { getThings } from "@/lib/store";

const T = "Дом · Топи Розитты";
const D = "Шкаф в Нарнию, морозный ларь, библиотека и оранжерея: что где лежит и когда поливали цветы.";
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
  return <AppShell>{(_, t) => <House token={t} />}</AppShell>;
}

export const thingsQuery = (token: string) => ({ queryKey: ["things", token], queryFn: () => getThings({ data: { token } }) });

function House({ token }: { token: string }) {
  const { data = [] } = useQuery(thingsQuery(token));
  return (
    <div className="space-y-4 pt-2">
      <h1 className="font-display text-xl text-primary">🏚 Весь дом</h1>
      <p className="text-sm text-muted-foreground">По желанию. Выбери одно место — и запиши туда пару вещей. Остальное подождёт.</p>
      <div className="grid grid-cols-2 gap-3">
        {SPACES.map((s) => {
          const n = data.filter((x) => x.space === s.key).length;
          return (
            <Link key={s.key} to="/house/$space" params={{ space: s.key }} className="flex flex-col items-center gap-1 rounded-2xl border-2 border-primary/40 bg-card p-3 text-center transition hover:border-accent">
              <img src={s.img} alt="" loading="lazy" className="pixel h-24 w-24 object-contain" />
              <span className="text-sm font-semibold">{s.title}</span>
              <span className="text-xs text-muted-foreground">{n ? `${n} шт.` : "пусто"}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
