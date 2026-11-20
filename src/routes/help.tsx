import { Link, createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { GUIDE } from "@/lib/guide";

const T = "Справка · Топи Розитты";
const D = "Коротко о том, как пользоваться описью сундуков и с чего начать.";
export const Route = createFileRoute("/help")({
  head: () => ({ meta: [
    { title: T }, { name: "description", content: D }, { property: "og:title", content: T },
    { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <AppShell>{() => <Help />}</AppShell>,
});

const slug = (t: string) => "g-" + GUIDE.findIndex((g) => g.title === t);

function Help() {
  return (
    <div className="space-y-4 pt-2">
      <section className="space-y-3 rounded-2xl border-2 border-primary/50 bg-card p-5">
        <h1 className="font-display text-xl text-primary">Справка</h1>
        <p className="text-sm text-muted-foreground">Опись всего дома: сфотографировали сундук — Розитта записала, что внутри. Потом ищете вещь словом.</p>
        <Button asChild className="w-full"><Link to="/new">Собрать первый сундук</Link></Button>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg text-foreground">Коротко о главном</h2>
        {GUIDE.map((g, i) => (
          <details key={g.title} id={slug(g.title)} open={i === 0} className="group scroll-mt-20 rounded-2xl bg-card p-4">
            <summary className="flex cursor-pointer list-none items-center gap-3 font-semibold [&::-webkit-details-marker]:hidden">
              <span className="text-xl">{g.icon}</span>
              <span className="flex-1">{g.title}</span>
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <ul className="mt-3 space-y-1.5 pl-9 text-sm text-muted-foreground">
              {g.text.map((t) => <li key={t}>{t}</li>)}
            </ul>
            {g.to && (
              <Button asChild size="sm" variant="secondary" className="ml-9 mt-3">
                <Link to={g.to}>{g.cta} <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            )}
          </details>
        ))}
      </section>

      <blockquote className="rounded-2xl bg-card p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Главный принцип</p>
        <p className="mt-2 font-display text-lg">«Не нужно разбирать всё сразу. Один сундук — уже порядок.» — Розитта</p>
      </blockquote>
    </div>
  );
}
