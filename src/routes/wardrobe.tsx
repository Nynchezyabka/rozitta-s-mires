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
import { deleteCloth, deleteOutfit, getClothes, getOutfits, saveCloth, saveOutfit, type Cloth, type HouseholdData, type Outfit } from "@/lib/store";
import { getAiKey, isAiConfigured, recognizeCloth } from "@/lib/ai-key";
import { LAYERS, SEASONS, STATUSES, currentSeason, pick, pickOutfit, sizeMatches } from "@/lib/wardrobe";
import { matchesAll, normSearch } from "@/lib/search";

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
const CATS_KEY = "wardrobe-categories";
const readList = (k: string): string[] => { try { return JSON.parse(localStorage.getItem(k) ?? "[]"); } catch { return []; } };
type Draft = { id?: string; owner: string; name: string; layer: string; season: string; status: string; size: string; category: string; color: string; box_id: string | null; photo: string | null; photo_url: string | null };

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

  const [savedCats, setSavedCats] = useState<string[]>([]);
  useEffect(() => setSavedCats(readList(CATS_KEY)), []);
  const cats = useMemo(() => [...new Set([...savedCats, ...clothes.map((c) => c.category).filter(Boolean)])].sort((a, b) => a.localeCompare(b, "ru")), [savedCats, clothes]);
  const addCat = () => {
    const n = prompt("Новая категория. Например: Пижамы, Спорт, Термобельё")?.trim();
    if (!n) return;
    const next = [...new Set([...savedCats, n])]; setSavedCats(next); localStorage.setItem(CATS_KEY, JSON.stringify(next)); setCat(n);
  };
  const [cat, setCat] = useState("");
  const [text, setText] = useState("");
  const [tab, setTab] = useState<"things" | "looks">("things");
  const oq = useQuery({ queryKey: ["outfits", token], queryFn: () => getOutfits({ data: { token } }) });
  const outfits = oq.data ?? [];
  const [look, setLook] = useState<Partial<Outfit> | null>(null);
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState("");
  const [season, setSeason] = useState("");
  const [layer, setLayer] = useState("");
  const [size, setSize] = useState("");
  const shown = clothes.filter((c) => (!owner || c.owner === owner) && (!status || c.status === status) && (!season || c.season === season || c.season === "all") && (!layer || c.layer === layer) && (!cat || c.category === cat) && (!text.trim() || matchesAll(`${c.name} ${c.color} ${c.category}`, normSearch(text))) && sizeMatches(c.size, size));

  const [draft, setDraft] = useState<Draft | null>(null);
  const [outfit, setOutfit] = useState<Cloth[] | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["clothes", token] });
  const refreshLooks = () => qc.invalidateQueries({ queryKey: ["outfits", token] });
  const moveCloth = async (c: Cloth, p: Partial<Cloth>) => {
    try { await saveCloth({ data: { token, ...c, ...p, photo: null } }); refresh(); toast.success(p.box_id ? "Убрано в сундук" : "Висит в шкафу"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Не сохранилось"); }
  };
  const blank = (): Draft => ({ owner, name: "", layer: layer || "top", season: season || currentSeason(), status: status || "closet", size: "", category: cat, color: "", box_id: null, photo: null, photo_url: null });

  return (
    <div className="space-y-3 pt-2 pb-24">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-xl text-primary">👗 Гардероб</h1>
        <Button variant="secondary" size="sm" onClick={() => setOutfit(pickOutfit(clothes, owner, currentSeason()))}>🎲 Что надеть?</Button>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant={tab === "things" ? "default" : "secondary"} onClick={() => setTab("things")}>Вещи</Button>
        <Button size="sm" variant={tab === "looks" ? "default" : "secondary"} onClick={() => setTab("looks")}>✨ Образы и капсулы</Button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[{ id: "", label: "Все" }, ...people.map((p) => ({ id: p, label: p }))].map((p) => (
          <button key={p.id || "all"} type="button" onClick={() => setOwner(p.id)} className={`shrink-0 rounded-full border-2 px-3 py-1 text-sm ${owner === p.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{p.label}</button>
        ))}
        <button type="button" onClick={addPerson} className="shrink-0 rounded-full border-2 border-dashed border-border px-3 py-1 text-sm">+ Кто-то ещё</button>
      </div>
      {tab === "looks" ? <Looks outfits={outfits} clothes={clothes} owner={owner} onOpen={setLook} /> : <>
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Найти: чёрные брюки, пижама…" />
      <Chips list={STATUSES} value={status} onChange={setStatus} all="Любой статус" />
      <Chips list={SEASONS} value={season} onChange={setSeason} all="Любой сезон" />
      <Chips list={LAYERS} value={layer} onChange={setLayer} all="Всё" />
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <Chips list={cats.map((x) => ({ id: x, label: x }))} value={cat} onChange={setCat} all="Любая категория" />
        <button type="button" onClick={addCat} className="shrink-0 self-start rounded-full border-2 border-dashed border-border px-3 py-1 text-sm">+ Категория</button>
      </div>
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
                {c.box_id && <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); void moveCloth(c, { box_id: null, status: "closet" }); }} onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); void moveCloth(c, { box_id: null, status: "closet" }); } }} className="mt-1 inline-block rounded-full border border-border px-2 py-0.5 text-xs">🚪 Достать в шкаф</span>}
              </div>
            </button>
          ))}
        </div>
      )}
      </>}

      <Button className="fixed bottom-6 right-6 z-40 h-14 rounded-full px-5 shadow-lg" onClick={() => tab === "looks" ? setLook({ name: "", owner, cloth_ids: [] }) : setDraft(blank())}><Plus className="mr-1" />{tab === "looks" ? "Образ" : "Вещь"}</Button>

      {draft && <ClothDialog draft={draft} people={people} cats={cats} looks={outfits.filter((o) => draft.id && o.cloth_ids.includes(draft.id)).map((o) => o.name || "Без названия")} d={d} token={token} onClose={() => setDraft(null)} onSaved={refresh} />}
      {look && <LookDialog look={look} clothes={clothes} people={people} token={token} onClose={() => setLook(null)} onSaved={refreshLooks} />}
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

function ClothDialog({ draft, people, cats, looks, d, token, onClose, onSaved }: { draft: Draft; people: string[]; cats: string[]; looks: string[]; d: HouseholdData; token: string; onClose: () => void; onSaved: () => void }) {
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
      setF((x) => ({ ...x, name: x.name || g.name, layer: pick(LAYERS, g.layer, x.layer), season: pick(SEASONS, g.season, x.season), size: x.size || (g.size ?? ""), color: x.color || (g.color ?? "") }));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Не распозналось"); }
    finally { setBusy(""); }
  }
  async function save() {
    setBusy("save");
    try {
      await saveCloth({ data: { token, id: f.id, owner: f.owner, name: f.name.trim(), layer: f.layer, season: f.season, status: f.status, size: f.size.trim(), category: f.category.trim(), color: f.color.trim(), box_id: f.box_id, photo: f.photo } });
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
        <Input value={f.color} onChange={(e) => set({ color: e.target.value })} placeholder="Цвет: чёрный, мятный…" />
        <Input value={f.category} onChange={(e) => set({ category: e.target.value })} list="cloth-cats" placeholder="Своя категория: пижамы, спорт…" />
        <datalist id="cloth-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
        {looks.length > 0 && <p className="text-xs text-muted-foreground">✨ Входит в образы: {looks.join(", ")}</p>}
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

function Looks({ outfits, clothes, owner, onOpen }: { outfits: Outfit[]; clothes: Cloth[]; owner: string; onOpen: (o: Outfit) => void }) {
  const list = outfits.filter((o) => !owner || o.owner === owner);
  const byId = Object.fromEntries(clothes.map((c) => [c.id, c]));
  if (!list.length) return <p className="rounded-lg border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">Образов пока нет. Сфотографируйтесь в зеркале или разложите вещи, затем отметьте, что на фото.</p>;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {list.map((o) => {
        const items = o.cloth_ids.map((id) => byId[id]).filter((c): c is Cloth => !!c);
        return (
          <button key={o.id} type="button" onClick={() => onOpen(o)} className="overflow-hidden rounded-lg border-2 border-border bg-card text-left">
            <div className="aspect-square bg-muted">{o.photo_url ? <img src={o.photo_url} alt={o.name} className="h-full w-full object-cover" loading="lazy" /> : (
              <div className="grid h-full grid-cols-2 gap-0.5">{items.slice(0, 4).map((c) => c.photo_url ? <img key={c.id} src={c.photo_url} alt="" className="h-full w-full object-cover" /> : <div key={c.id} className="grid place-items-center text-2xl">{LAYERS.find((l) => l.id === c.layer)?.icon}</div>)}</div>
            )}</div>
            <div className="p-2"><p className="line-clamp-2 text-sm font-medium">{o.name || "Без названия"}</p><p className="text-xs text-muted-foreground">{items.length} вещ.{o.owner ? ` · ${o.owner}` : ""}</p></div>
          </button>
        );
      })}
    </div>
  );
}

function LookDialog({ look, clothes, people, token, onClose, onSaved }: { look: Partial<Outfit>; clothes: Cloth[]; people: string[]; token: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(look.name ?? "");
  const [owner, setOwner] = useState(look.owner ?? "");
  const [ids, setIds] = useState<string[]>(look.cloth_ids ?? []);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const shown = photo ?? look.photo_url ?? null;
  const pool = clothes.filter((c) => !owner || c.owner === owner || !c.owner || ids.includes(c.id));
  const toggle = (id: string) => setIds((x) => x.includes(id) ? x.filter((y) => y !== id) : [...x, id]);
  async function save() {
    setBusy(true);
    try { await saveOutfit({ data: { token, id: look.id, name: name.trim(), owner, cloth_ids: ids, photo } }); onSaved(); onClose(); toast.success("Образ сохранён"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Не сохранилось"); setBusy(false); }
  }
  async function remove() {
    if (!look.id || !confirm("Удалить образ? Сами вещи останутся.")) return;
    await deleteOutfit({ data: { token, id: look.id } }); onSaved(); onClose();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{look.id ? "Образ" : "Новый образ или капсула"}</DialogTitle></DialogHeader>
        <input ref={file} type="file" accept="image/*" capture="environment" hidden onChange={async (e) => { const x = e.target.files?.[0]; if (x) setPhoto(await compressImage(x, 1024)); e.target.value = ""; }} />
        <button type="button" onClick={() => file.current?.click()} className="grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted">
          {shown ? <img src={shown} alt="" className="h-full w-full object-cover" /> : <span className="flex items-center gap-2 text-sm"><Camera />Фото в зеркале (можно без)</span>}
        </button>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название: В театр, Поездка в Питер…" />
        <Chips list={people.map((p) => ({ id: p, label: p }))} value={owner} onChange={setOwner} all="Общее" />
        <p className="text-sm">Что здесь из гардероба? Отмечено: {ids.length}</p>
        <div className="grid grid-cols-3 gap-1.5">
          {pool.map((c) => {
            const on = ids.includes(c.id);
            return (
              <button key={c.id} type="button" onClick={() => toggle(c.id)} aria-pressed={on} className={`relative overflow-hidden rounded-md border-2 text-left ${on ? "border-primary" : "border-border opacity-70"}`}>
                {c.photo_url ? <img src={c.photo_url} alt="" className="aspect-square w-full object-cover" /> : <div className="grid aspect-square place-items-center text-2xl">{LAYERS.find((l) => l.id === c.layer)?.icon}</div>}
                <p className="line-clamp-1 p-1 text-[11px]">{c.name || "Без названия"}</p>
                {on && <span className="absolute right-1 top-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">✓</span>}
              </button>
            );
          })}
          {!pool.length && <p className="col-span-3 text-sm text-muted-foreground">Сначала добавьте вещи на вкладке «Вещи».</p>}
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={save} disabled={busy}>{busy ? "Сохраняю…" : "Сохранить"}</Button>
          {look.id && <Button variant="ghost" size="icon" onClick={remove} aria-label="Удалить"><Trash2 /></Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
