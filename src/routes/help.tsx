import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { GUIDE } from "@/lib/guide";

const T = "Справка — Тайные Хроники Топей Розитты";
const D = "Коротко о том, как пользоваться описью сундуков и с чего начать.";
export const Route = createFileRoute("/help")({
  head: () => ({ meta: [
    { title: T }, { name: "description", content: D }, { property: "og:title", content: T },
    { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <AppShell>{() => <Help />}</AppShell>,
});

function Help() {
  return (
    <div className="space-y-4 pt-2">
      <section className="space-y-3 rounded-2xl border-2 border-primary/50 bg-card p-5">
        <h1 className="font-display text-xl text-primary">Справка</h1>
        <p className="text-sm text-muted-foreground">Сфотографировали коробку — Розитта записала, что внутри. Потом ищете вещь словом и видите номер сундука и где он стоит.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild><Link to="/new">Собрать сундук</Link></Button>
          <Button asChild variant="secondary"><Link to="/grimoire">Открыть Гримуар</Link></Button>
        </div>
      </section>
      <div className="space-y-2">
        {GUIDE.map((g, i) => (
          <details key={g.title} open={i === 1} className="group rounded-2xl bg-card p-4">
            <summary className="flex cursor-pointer list-none items-center gap-3 font-semibold">
              <span className="text-xl">{g.icon}</span>
              <span className="flex-1">{g.title}</span>
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <ul className="mt-3 space-y-1.5 pl-9 text-sm text-muted-foreground">
              {g.text.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}
