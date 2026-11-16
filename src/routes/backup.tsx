import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { download, toCsv, toJson } from "@/lib/backup";
import type { HouseholdData } from "@/lib/store";

const T = "Сохранить копию · Топи Розитты";
const D = "Выгрузка всех сундуков, вещей, групп и заметок в JSON и CSV.";
export const Route = createFileRoute("/backup")({
  head: () => ({ meta: [
    { title: T }, { name: "description", content: D }, { property: "og:title", content: T },
    { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <AppShell>{(d, t) => <Backup d={d} token={t} />}</AppShell>,
});

function Backup({ d, token }: { d: HouseholdData; token: string }) {
  const day = new Date().toISOString().slice(0, 10);
  const link = typeof window !== "undefined" ? `${location.origin}/join/${token}` : "";
  return (
    <div className="space-y-4 pt-2">
      <h1 className="font-display text-xl text-primary">💾 Сохранить копию</h1>
      <p className="text-muted-foreground">Все сундуки ({d.boxes.length}), вещи ({d.items.length}), группы и заметки — в файл на этом устройстве.</p>
      <Button className="h-14 w-full rounded-2xl text-base" onClick={() => download(`topi-rozitty-${day}.json`, toJson(d), "application/json")}>Полная копия (JSON)</Button>
      <Button variant="secondary" className="h-14 w-full rounded-2xl text-base" onClick={() => download(`topi-rozitty-${day}.csv`, toCsv(d), "text/csv;charset=utf-8")}>Таблица вещей (CSV)</Button>
      <div className="space-y-2 rounded-2xl border-2 border-accent/60 bg-card p-4 text-sm">
        <p>🗝 Сохраните ссылку-ключ дома: без неё доступ не вернуть.</p>
        <Button variant="outline" className="w-full" onClick={async () => { await navigator.clipboard.writeText(link); toast.success("Ссылка-ключ скопирована"); }}>Скопировать ссылку-ключ</Button>
      </div>
    </div>
  );
}
