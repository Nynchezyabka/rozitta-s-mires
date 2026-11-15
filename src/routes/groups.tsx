import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GROUP_COLORS, GROUP_ICONS } from "@/lib/defaults";
import { deleteGroup, saveGroup } from "@/lib/store.functions";
import type { HouseholdData } from "@/lib/household";

export const Route = createFileRoute("/groups")({
  head: () => ({
    meta: [
      { title: "Группы — Коробки" },
      { name: "description", content: "Группы коробок с цветами и значками: кухня, детское, документы и другие." },
      { property: "og:title", content: "Группы — Коробки" },
      { property: "og:description", content: "Группы коробок с цветами и значками." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AppShell>{(d, t) => <Groups d={d} token={t} />}</AppShell>,
});

type G = { id?: string; name: string; color: string; icon: string };

function Groups({ d, token }: { d: HouseholdData; token: string }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<G | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["household", token] });
  const count = (id: string) => d.boxes.filter((b) => b.group_id === id).length;

  if (edit)
    return (
      <div className="space-y-5 pt-2">
        <h1 className="font-display text-2xl font-bold">{edit.id ? "Группа" : "Новая группа"}</h1>
        <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Название, например «Дача»" className="h-12 text-base" />
        <div>
          <p className="mb-2 text-sm font-medium">Цвет</p>
          <div className="flex flex-wrap gap-2">
            {GROUP_COLORS.map((c) => (
              <button key={c} onClick={() => setEdit({ ...edit, color: c })} className={`h-11 w-11 rounded-full ${edit.color === c ? "ring-4 ring-foreground" : ""}`} style={{ backgroundColor: c }} aria-label={c} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Значок</p>
          <div className="flex flex-wrap gap-2">
            {GROUP_ICONS.map((i) => (
              <button key={i} onClick={() => setEdit({ ...edit, icon: i })} className={`h-11 w-11 rounded-xl bg-card text-xl ${edit.icon === i ? "ring-2 ring-primary" : ""}`}>
                {i}
              </button>
            ))}
          </div>
        </div>
        <Button
          className="h-14 w-full rounded-2xl text-base"
          disabled={!edit.name.trim()}
          onClick={async () => {
            await saveGroup({ data: { token, ...edit, position: d.groups.length } });
            await refresh();
            setEdit(null);
          }}
        >
          Сохранить
        </Button>
        <div className="flex justify-between">
          <button className="text-sm text-muted-foreground" onClick={() => setEdit(null)}>
            ← назад
          </button>
          {edit.id && (
            <button
              className="flex items-center gap-1 text-sm text-destructive"
              onClick={async () => {
                if (!confirm("Удалить группу? Коробки останутся без группы.")) return;
                await deleteGroup({ data: { token, id: edit.id! } });
                await refresh();
                setEdit(null);
              }}
            >
              <Trash2 className="h-4 w-4" /> Удалить
            </button>
          )}
        </div>
      </div>
    );

  return (
    <div className="space-y-3 pt-2">
      <h1 className="font-display text-2xl font-bold">Группы</h1>
      {d.groups.map((g) => (
        <button key={g.id} onClick={() => setEdit(g)} className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: g.color }}>
            {g.icon}
          </span>
          <span className="flex-1 font-medium">{g.name}</span>
          <span className="text-sm text-muted-foreground">{count(g.id)} кор.</span>
        </button>
      ))}
      <Button variant="outline" className="h-12 w-full rounded-2xl" onClick={() => setEdit({ name: "", color: GROUP_COLORS[0]!, icon: "📦" })}>
        + Добавить группу
      </Button>
    </div>
  );
}
