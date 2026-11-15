import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CHAPTERS, TIPS, type Tip } from "@/lib/grimoire";
import { deleteNote, saveNote } from "@/lib/store";
import type { HouseholdData } from "@/lib/store";

const T = "Гримуар — Тайные Хроники Топей Розитты";
const D = "Советы о порядке для уставших и СДВГ-мозга глазами архитектора и общие заметки дома.";
export const Route = createFileRoute("/grimoire")({
  head: () => ({ meta: [
    { title: T }, { name: "description", content: D }, { property: "og:title", content: T },
    { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <AppShell>{(d, t) => <Grimoire d={d} token={t} />}</AppShell>,
});

const READ_KEY = "grimoire-read";

function Grimoire({ d, token }: { d: HouseholdData; token: string }) {
  const [tab, setTab] = useState<"tips" | "notes">("tips");
  return (
    <div className="space-y-4 pt-2">
      <h1 className="font-display text-xl text-primary">📖 Гримуар</h1>
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
        {([["tips", "Советы"], ["notes", `Заметки · ${d.notes.length}`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-xl py-2 text-sm font-semibold ${tab === k ? "bg-primary text-primary-foreground" : "text-secondary-foreground"}`}>{l}</button>
        ))}
      </div>
      {tab === "tips" ? <Tips /> : <Notes d={d} token={token} />}
    </div>
  );
}

function Tips() {
  const [read, setRead] = useState<string[]>([]);
  const [open, setOpen] = useState<Tip | null>(null);
  useEffect(() => setRead(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]")), []);
  const mark = (id: string) => {
    const n = read.includes(id) ? read : [...read, id];
    setRead(n);
    localStorage.setItem(READ_KEY, JSON.stringify(n));
  };
  const today = TIPS[new Date().getDate() % TIPS.length]!;

  if (open)
    return (
      <article className="space-y-4 rounded-2xl border-2 border-accent/60 bg-card p-5">
        <div className="text-5xl">{open.icon}</div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{open.chapter}</p>
        <h2 className="font-display text-lg text-primary">{open.title}</h2>
        <p className="rounded-xl bg-secondary p-3 text-sm italic">✨ «{open.spell}»</p>
        {open.text.map((t) => <p key={t} className="text-base leading-relaxed">{t}</p>)}
        <div className="rounded-xl border border-primary/50 p-3 text-sm"><b>Попробуйте:</b> {open.try}</div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setOpen(null)}>Назад</Button>
          <Button onClick={() => { mark(open.id); toast.success("🐸 Розитта поставила печать"); setOpen(null); }}>Прочитала ✓</Button>
        </div>
      </article>
    );

  return (
    <div className="space-y-5">
      <button onClick={() => setOpen(today)} className="block w-full rounded-2xl border-2 border-primary/60 bg-card p-4 text-left">
        <p className="text-xs text-muted-foreground">Совет дня от Розитты</p>
        <p className="mt-1 font-semibold">{today.icon} {today.title}</p>
        <p className="mt-1 text-sm italic text-muted-foreground">«{today.spell}»</p>
      </button>
      <p className="text-sm text-muted-foreground">Прочитано {read.length} из {TIPS.length}</p>
      {CHAPTERS.map((c) => (
        <section key={c} className="space-y-2">
          <h2 className="font-semibold">{c}</h2>
          <div className="grid grid-cols-2 gap-2">
            {TIPS.filter((t) => t.chapter === c).map((t) => (
              <button key={t.id} onClick={() => setOpen(t)} className="flex flex-col gap-1 rounded-2xl bg-card p-3 text-left">
                <span className="text-2xl">{t.icon}</span>
                <span className="text-sm font-semibold leading-tight">{t.title}</span>
                {read.includes(t.id) && <span className="text-xs text-primary">✓ прочитано</span>}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Notes({ d, token }: { d: HouseholdData; token: string }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<{ id?: string; title: string; body: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["household", token] });

  if (edit)
    return (
      <div className="space-y-3">
        <Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="Заголовок" className="h-12" />
        <Textarea value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} placeholder="Что прочитала, придумала, хочу купить…" rows={10} />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setEdit(null)}>Отмена</Button>
          <Button disabled={busy || !(edit.title.trim() || edit.body.trim())} onClick={async () => {
            setBusy(true);
            try { await saveNote({ data: { token, ...edit } }); await refresh(); setEdit(null); toast.success("Записала в гримуар"); }
            catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
          }}>Сохранить</Button>
        </div>
        {edit.id && (
          <button className="flex w-full items-center justify-center gap-2 py-2 text-sm text-destructive" onClick={async () => {
            await deleteNote({ data: { token, id: edit.id! } }); await refresh(); setEdit(null); toast("Заметка удалена");
          }}><Trash2 className="h-4 w-4" /> Удалить заметку</button>
        )}
      </div>
    );

  return (
    <div className="space-y-3">
      <Button className="h-12 w-full" onClick={() => setEdit({ title: "", body: "" })}><Plus className="h-4 w-4" /> Новая заметка</Button>
      {d.notes.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">🕸️ Пока пусто. Заметки видят все хранители ключей.</p>}
      {d.notes.map((n) => (
        <button key={n.id} onClick={() => setEdit({ id: n.id, title: n.title, body: n.body })} className="block w-full rounded-2xl bg-card p-4 text-left">
          <p className="font-semibold">{n.title || "Без названия"}</p>
          <p className="line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{n.body}</p>
          <p className="mt-1 text-xs text-muted-foreground">{new Date(n.updated_at).toLocaleDateString("ru-RU")}</p>
        </button>
      ))}
    </div>
  );
}
