import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { getTrash, restoreBox } from "@/lib/store";

export const Route = createFileRoute("/trash")({
  head: () => ({ meta: [
    { title: "Корзина сундуков · Топи Розитты" },
    { name: "description", content: "Удалённые сундуки дома и восстановление их содержимого." },
    { property: "og:title", content: "Корзина сундуков · Топи Розитты" },
    { property: "og:description", content: "Удалённые сундуки дома и восстановление их содержимого." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <AppShell>{(_, token) => <Suspense fallback={<p className="py-10 text-center">Загружаю корзину…</p>}><Trash key={token} token={token} /></Suspense>}</AppShell>,
});
const trashQuery = (token: string) => queryOptions({ queryKey: ["trash", token], queryFn: () => getTrash({ data: { token } }) });
function Trash({ token }: { token: string }) {
  const { data } = useSuspenseQuery(trashQuery(token));
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [restored, setRestored] = useState<{ id: string; number: number } | null>(null);
  const restore = async (id: string, number: number) => {
    setBusy(true);
    try {
      await restoreBox({ data: { token, id } });
      await Promise.all([qc.invalidateQueries({ queryKey: ["household", token] }), qc.invalidateQueries({ queryKey: ["trash", token] })]);
      setRestored({ id, number });
      toast.success(`Сундук №${number} восстановлен`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  return <div className="space-y-4 pt-2"><h1 className="font-display text-2xl font-bold">Корзина</h1>
    {restored && <Link to="/box/$id" params={{ id: restored.id }} className="block text-primary underline">Открыть восстановленный сундук №{restored.number}</Link>}
    {!data.length && <p className="py-8 text-center text-muted-foreground">Нет удалённых сундуков.</p>}
    {data.map((b) => <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-card p-4">
      <div className="min-w-0 flex-1"><h2 className="font-semibold">Сундук №{b.number}</h2><p className="break-words text-sm text-muted-foreground">{b.location}</p><p className="line-clamp-2 text-sm">{b.note}</p><p className="text-xs text-muted-foreground">Удалён {new Date(b.deleted_at).toLocaleDateString("ru-RU")}</p></div>
      <Button variant="outline" disabled={busy} onClick={() => restore(b.id, b.number)}><Undo2 className="h-4 w-4" />Восстановить</Button>
    </div>)}
  </div>;
}