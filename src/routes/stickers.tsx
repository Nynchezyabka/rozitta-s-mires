import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Printer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { stickersPdf } from "@/lib/stickers";
import type { HouseholdData } from "@/lib/household";

export const Route = createFileRoute("/stickers")({
  head: () => ({
    meta: [
      { title: "Наклейки — Тайные Хроники Топей Розитты" },
      { name: "description", content: "Лист наклеек с номером, цветом и группой коробки в PDF." },
      { property: "og:title", content: "Наклейки — Тайные Хроники Топей Розитты" },
      { property: "og:description", content: "Лист наклеек с номером, цветом и группой коробки в PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AppShell>{(d) => <Stickers d={d} />}</AppShell>,
});

function Stickers({ d }: { d: HouseholdData }) {
  const [sel, setSel] = useState<Set<string>>(() => new Set(d.boxes.map((b) => b.id)));
  const [qr, setQr] = useState(true);
  const [busy, setBusy] = useState(false);
  const gmap = Object.fromEntries(d.groups.map((g) => [g.id, g]));
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="space-y-4 pt-2">
      <h1 className="font-display text-2xl font-bold">Наклейки</h1>
      {d.boxes.length === 0 ? (
        <p className="text-muted-foreground">Сначала добавьте коробки.</p>
      ) : (
        <>
          <label className="flex items-center justify-between rounded-2xl bg-card p-3">
            <span>QR-код на наклейке</span>
            <Switch checked={qr} onCheckedChange={setQr} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {d.boxes.map((b) => {
              const g = gmap[b.group_id ?? ""];
              return (
                <button key={b.id} onClick={() => toggle(b.id)} className={`overflow-hidden rounded-xl border-2 bg-card text-left ${sel.has(b.id) ? "border-primary" : "border-transparent opacity-50"}`}>
                  <div className="truncate px-2 py-1 text-xs font-semibold" style={{ backgroundColor: g?.color ?? "transparent" }}>
                    {g ? `${g.icon} ${g.name}` : "Без группы"}
                  </div>
                  <div className="px-2 py-2 font-display text-3xl font-bold">{b.number}</div>
                </button>
              );
            })}
          </div>
          <Button
            className="h-14 w-full rounded-2xl text-base"
            disabled={busy || sel.size === 0}
            onClick={async () => {
              setBusy(true);
              try {
                await stickersPdf(
                  d.boxes.filter((b) => sel.has(b.id)).map((b) => {
                    const g = gmap[b.group_id ?? ""];
                    return { number: b.number, groupName: g?.name ?? "Без группы", color: g?.color ?? "#dddddd", icon: g?.icon ?? "📦", url: qr ? `${location.origin}/box/${b.id}` : undefined };
                  }),
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <Printer className="h-5 w-5" /> {busy ? "Готовлю…" : `Скачать PDF (${sel.size})`}
          </Button>
        </>
      )}
    </div>
  );
}
