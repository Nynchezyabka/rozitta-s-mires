import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Loader2, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { compressImage } from "@/lib/household";
import { deleteCloth, getClothes, saveCloth, type Cloth, type HouseholdData } from "@/lib/store";
import { getAiKey, isAiConfigured, recognizeCloth } from "@/lib/ai-key";
import { LAYERS, SEASONS, STATUSES, currentSeason, pick, pickOutfit, sizeMatches } from "@/lib/wardrobe";

const T = "Гардероб · Топи Розитты";
const D = "Одежда всей семьи: фото, сезоны, размеры, вещи на вырост и подбор комплекта.";
export const Route = createFileRoute("/wardrobe")({
  head: () => ({ meta: [
    { title: T }, { name: "description", content: D }, { property: "og:title", content: T },
    { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <AppShell>{(d, t) => <Wardrobe d={d} token={t} />}</AppShell>,
});

const PEOPLE_KEY = "wardrobe-people";
type Draft = { id?: string; owner: string; name: string; layer: string; season: string; status: string; size: string; box_id: string | null; photo: string | null; photo_url: string | null };

function Chips<T extends { id: string; label: string; icon?: string }>({ list, value, onChange, all }: { list: readonly T[]; value: string; onChange: (v: string) => void; all?: string }) {
  const cls = (on: boolean) => `shrink-0 rounded-full border-2 px-3 py-1 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`;
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {all && <button type="button" className={cls(value === "")} onClick={() => onChange("")}>{all}</button>}
      {list.map((x) => <button type="button" key={x.id} className={cls(value === x.id)} onClick={() => onChange(value === x.id && all ? "" : x.id)}>{x.icon ? `${x.icon} ` : ""}{x.label}</button>)}
    </div>
  );
}

function Wardrobe({ d, token }: { d: HouseholdData; token: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["clothes", token], queryFn: () => getClothes({ data: { token } }) });
  const clothes = q.data ?? [];
  const [saved, setSaved] = useState<string[]>([]);
  useEffect(() => { try { setSaved(JSON.parse(localStorage.getItem(PEOPLE_KEY) ?? "[]")); } catch { /* пусто */ } }, []);
  const people = useMemo(() => [...new Set([...saved, ...clothes.map((c) => c.owner).filter(Boolean)])], [saved, clothes]);
  const addPerson = () => {
    const n = prompt("Чьи вещи? Например: Муж, Миша, Малыш")?.trim();
    if (!n) return;
    const next = [...new Set([...saved, n])]; setSaved(next); localStorage.setItem(PEOPLE_KEY, JSON.stringify(next)); setOwner(n);
  };

  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState("");
  const [season, setSeason] = useState("");
  const [layer, setLayer] = useState("");
  const [size, setSize] = useState("");
  const shown = clothes.filter((c) => (!owner || c.owner === owner) && (!status || c.status === status) && (!season || c.season === season || c.season === "all") && (!layer || c.layer === layer) && sizeMatches(c.size, size));

  const [draft, setDraft] = useState<Draft | null>(null);
  const [outfit, setOutfit] = useState<Cloth[] | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["clothes", token] });
  const blank = (): Draft => ({ owner, name: "", layer: layer || "top", season: season || currentSeason(), status: status || "closet", size: "", box_id: null, photo: null, photo_url: null });

  return (
    <div className="space-y-3 pt-2 pb-24">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-xl text-primary">👗 Гардероб</h1>
        <Button variant="secondary" size="sm" onClick={() => setOutfit(pickOutfit(clothes, owner, currentSeason()))}>🎲 Что надеть?</Button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[{ id: "", label: "Все" }, ...people.map((p) => ({ id: p, label: p }))].map((p) => (
          <button key={p.id || "all"} type="button" onClick={() => setOwner(p.id)} className={`shrink-0 rounded-full border-2 px-3 py-1 text-sm ${owner === p.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{p.label}</button>
        ))}
        <button type="button" onClick={addPerson} className="shrink-0 rounded-full border-2 border-dashed border-border px-3 py-1 text-sm">+ Кто-то ещё</button>
      </div>
      <Chips list={STATUSES} value={status} onChange={setStatus} all="Любой статус" />
      <Chips list={SEASONS} value={season} onChange={setSeason} all="Любой сезон" />
      <Chips list={LAYERS} value={layer} onChange={setLayer} all="Всё" />
      <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="Размер или рост, например 86" className="max-w-xs" />

      {q.isLoading ? <p className="text-sm text-muted-foreground">Розитта открывает шкаф…</p> : shown.length === 0 ? (
        <p className="rounded-lg border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">{clothes.length ? "Под эти фильтры ничего нет." : "Шкаф пока пуст. Сфотографируйте первую вещь."}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {shown.map((c) => (
            <button key={c.id} type="button" onClick={() => setDraft({ ...c, photo: null })} className="overflow-hidden rounded-lg border-2 border-border bg-card text-left">
              <div className="aspect-square bg-muted">{c.photo_url ? <img src={c.photo_url} alt={c.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center text-4xl">{LAYERS.find((l) => l.id === c.layer)?.icon}</div>}</div>
              <div className="space-y-0.5 p-2">
                <p className="line-clamp-2 text-sm font-medium">{c.name || "Без названия"}</p>
                <p className="text-xs text-muted-foreground">{STATUSES.find((s) => s.id === c.status)?.icon} {SEASONS.find((s) => s.id === c.season)?.icon}{c.size ? ` · ${c.size}` : ""}{c.owner ? ` · ${c.owner}` : ""}</p>
                {c.box_id && <p className="text-xs text-muted-foreground">📦 Сундук №{d.boxes.find((b) => b.id === c.box_id)?.number ?? "?"}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      <Button className="fixed bottom-6 right-6 z-40 h-14 rounded-full px-5 shadow-lg" onClick={() => setDraft(blank())}><Plus className="mr-1" />Вещь</Button>

      {draft && <ClothDialog draft={draft} people={people} d={d} token={token} onClose={() => setDraft(null)} onSaved={refresh} />}
      <Dialog open={!!outfit} onOpenChange={(o) => !o && setOutfit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>🎲 Розитта предлагает{owner ? ` для: ${owner}` : ""}</DialogTitle></DialogHeader>
          {outfit?.length ? (
            <div className="grid grid-cols-2 gap-2">{outfit.map((c) => (
              <div key={c.id} className="overflow-hidden rounded-lg border-2 border-border">
                {c.photo_url ? <img src={c.photo_url} alt={c.name} className="aspect-square w-full object-cover" /> : <div className="grid aspect-square place-items-center text-4xl">{LAYERS.find((l) => l.id === c.layer)?.icon}</div>}
                <p className="p-1.5 text-sm">{c.name}</p>
              </div>
            ))}</div>
          ) : <p className="text-sm text-muted-foreground">В шкафу пока не из чего собрать комплект на этот сезон{owner ? "" : " — выберите человека сверху"}.</p>}
          {!!outfit?.length && <Button variant="secondary" onClick={() => setOutfit(pickOutfit(clothes, owner, currentSeason()))}>Ещё вариант</Button>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClothDialog({ draft, people, d, token, onClose, onSaved }: { draft: Draft; people: string[]; d: HouseholdData; token: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState(draft);
  const [busy, setBusy] = useState<"" | "ai" | "save">("");
  const file = useRef<HTMLInputElement>(null);
  const set = (p: Partial<Draft>) => setF((x) => ({ ...x, ...p }));

  async function onPhoto(fl: File) {
    const img = await compressImage(fl, 1024);
    set({ photo: img, photo_url: img });
    if (!isAiConfigured() || f.id) return;
    setBusy("ai");
    try {
      const g = await recognizeCloth(getAiKey(), img);
      setF((x) => ({ ...x, name: x.name || g.name, layer: pick(LAYERS, g.layer, x.layer), season: pick(SEASONS, g.season, x.season), size: x.size || (g.size ?? "") }));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Не распозналось"); }
    finally { setBusy(""); }
  }
  async function save() {
    setBusy("save");
    try {
      await saveCloth({ data: { token, id: f.id, owner: f.owner, name: f.name.trim(), layer: f.layer, season: f.season, status: f.status, size: f.size.trim(), box_id: f.box_id, photo: f.photo } });
      onSaved(); onClose(); toast.success("Вещь в гардеробе");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Не сохранилось"); setBusy(""); }
  }
  async function remove() {
    if (!f.id || !confirm("Убрать вещь из гардероба?")) return;
    await deleteCloth({ data: { token, id: f.id } }); onSaved(); onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{f.id ? "Вещь" : "Новая вещь"}</DialogTitle></DialogHeader>
        <input ref={file} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const x = e.target.files?.[0]; if (x) void onPhoto(x); e.target.value = ""; }} />
        <button type="button" onClick={() => file.current?.click()} className="grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted">
          {f.photo_url ? <img src={f.photo_url} alt="" className="h-full w-full object-cover" /> : <span className="flex items-center gap-2 text-sm"><Camera />Сфотографировать</span>}
        </button>
        {busy === "ai" && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Розитта разглядывает вещь…</p>}
        <Input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Что это? Например: мятный комбинезон" />
        <p className="text-xs text-muted-foreground">Чьё</p>
        <Chips list={people.map((p) => ({ id: p, label: p }))} value={f.owner} onChange={(v) => set({ owner: v })} all="Общее" />
        <Chips list={LAYERS} value={f.layer} onChange={(v) => set({ layer: v })} />
        <Chips list={SEASONS} value={f.season} onChange={(v) => set({ season: v })} />
        <Chips list={STATUSES} value={f.status} onChange={(v) => set({ status: v })} />
        <Input value={f.size} onChange={(e) => set({ size: e.target.value })} placeholder="Размер или рост: 86, 104-110, M, 42" />
        <select value={f.box_id ?? ""} onChange={(e) => set({ box_id: e.target.value || null })} className="h-10 w-full rounded-md border-2 border-border bg-card px-2 text-sm">
          <option value="">Не в сундуке</option>
          {d.boxes.map((b) => <option key={b.id} value={b.id}>📦 №{b.number}{b.note ? ` — ${b.note.slice(0, 40)}` : ""}{b.location ? ` (${b.location})` : ""}</option>)}
        </select>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={save} disabled={!!busy}>{busy === "save" ? "Сохраняю…" : "Сохранить"}</Button>
          {f.id && <Button variant="ghost" size="icon" onClick={remove} aria-label="Удалить"><Trash2 /></Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
