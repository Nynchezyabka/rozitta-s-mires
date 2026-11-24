import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Loader2, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ClothStorage } from "@/components/ClothStorage";
import { compressImage } from "@/lib/household";
import { deleteCloth, deleteOutfit, getClothes, getOutfits, saveCloth, saveOutfit, type Cloth, type HouseholdData, type Outfit } from "@/lib/store";
import { getAiKey, isAiConfigured, recognizeCloth } from "@/lib/ai-key";
import { LAYERS, SEASONS, STATUSES, clothDestination, selectedClothes, currentSeason, pick, pickOutfit, sizeMatches } from "@/lib/wardrobe";
import { matchesAll, normSearch } from "@/lib/search";

const T = "Гардероб · Топи Розитты";
const D = "Одежда всей семьи: фото, сезоны, размеры, вещи на вырост и подбор комплекта.";
export const Route = createFileRoute("/wardrobe")({
  validateSearch: (s: Record<string, unknown>): { item?: string } => typeof s["item"] === "string" ? { item: s["item"] } : {},
  head: () => ({ meta: [
    { title: T }, { name: "description", content: D }, { property: "og:title", content: T },
    { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <AppShell>{(d, t) => <Wardrobe d={d} token={t} />}</AppShell>,
});

const PEOPLE_KEY = "wardrobe-people";
const CATS_KEY = "wardrobe-categories";
const readList = (k: string): string[] => { try { const v: unknown = JSON.parse(localStorage.getItem(k) ?? "[]"); return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []; } catch { return []; } };
type Draft = { id?: string; owner: string; name: string; layer: string; season: string; status: string; size: string; category: string; color: string; box_id: string | null; photo: string | null; photo_url: string | null };

function Chips<T extends { id: string; label: string; icon?: string }>({ list, value, onChange, all }: { list: readonly T[]; value: string; onChange: (v: string) => void; all?: string }) {
  const cls = (on: boolean) => `h-auto shrink-0 rounded-full border-2 px-3 py-1 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`;
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {all && <Button variant="ghost" type="button" className={cls(value === "")} onClick={() => onChange("")}>{all}</Button>}
      {list.map((x) => <Button variant="ghost" type="button" key={x.id} className={cls(value === x.id)} onClick={() => onChange(value === x.id && all ? "" : x.id)}>{x.icon ? `${x.icon} ` : ""}{x.label}</Button>)}
    </div>
  );
}

function Wardrobe({ d, token }: { d: HouseholdData; token: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["clothes", token], queryFn: () => getClothes({ data: { token } }) });
  const clothes = q.data ?? [];
  const [saved, setSaved] = useState<string[]>([]);
  useEffect(() => setSaved(readList(PEOPLE_KEY)), []);
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
  const [color, setColor] = useState("");
  const colors = [...new Set(clothes.map((c) => c.color).filter(Boolean))].sort();
  const [tab, setTab] = useState<"things" | "looks">("things");
  const oq = useQuery({ queryKey: ["outfits", token], queryFn: () => getOutfits({ data: { token } }) });
  const outfits = oq.data ?? [];
  const [look, setLook] = useState<Partial<Outfit> | null>(null);
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState("");
  const [season, setSeason] = useState("");
  const [layer, setLayer] = useState("");
  const [size, setSize] = useState("");
  const shown = clothes.filter((c) => (!owner || c.owner === owner) && (!status || c.status === status) && (!season || c.season === season || c.season === "all") && (!layer || c.layer === layer) && (!color || c.color === color) && (!cat || c.category === cat) && (!text.trim() || matchesAll(`${c.name} ${c.color} ${c.category}`, normSearch(text))) && sizeMatches(c.size, size));

  const [draft, setDraft] = useState<Draft | null>(null);
  const { item } = Route.useSearch();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!item || handled.current === item || !q.data) return;
    const c = q.data.find((c) => c.id === item);
    if (c) { setDraft({ ...c, photo: null }); handled.current = item; }
  }, [item, q.data]);
  const [outfit, setOutfit] = useState<Cloth[] | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["clothes", token] });
  const refreshLooks = () => qc.invalidateQueries({ queryKey: ["outfits", token] });
  const blank = (): Draft => ({ owner, name: "", layer: layer || "top", season: season || currentSeason(), status: status || "closet", size: "", category: cat, color: "", box_id: null, photo: null, photo_url: null });

  return (
    <div className="space-y-3 pt-2 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl text-primary">👗 Гардероб</h1>
        <Button variant="secondary" size="sm" onClick={() => setOutfit(pickOutfit(clothes, owner, currentSeason()))}>🎲 Что надеть?</Button>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant={tab === "things" ? "default" : "secondary"} onClick={() => setTab("things")}>Вещи</Button>
        <Button size="sm" variant={tab === "looks" ? "default" : "secondary"} onClick={() => setTab("looks")}>✨ Образы и капсулы</Button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[{ id: "", label: "Все" }, ...people.map((p) => ({ id: p, label: p }))].map((p) => (
          <Button variant="ghost" key={p.id || "all"} type="button" onClick={() => setOwner(p.id)} className={`h-auto shrink-0 rounded-full border-2 px-3 py-1 text-sm ${owner === p.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{p.label}</Button>
        ))}
        <Button variant="ghost" type="button" onClick={addPerson} className="h-auto shrink-0 rounded-full border-2 border-dashed border-border px-3 py-1 text-sm">+ Кто-то ещё</Button>
      </div>
      {tab === "looks" ? oq.isPending ? <p>Открываю образы…</p> : oq.isError ? <p className="text-destructive">Не удалось открыть образы. <Button variant="link" onClick={() => void oq.refetch()}>Повторить</Button></p> : <Looks outfits={outfits} clothes={clothes} owner={owner} onOpen={setLook} /> : <>
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Найти: чёрные брюки, пижама…" />
      <Chips list={STATUSES} value={status} onChange={setStatus} all="Любой статус" />
      <Chips list={SEASONS} value={season} onChange={setSeason} all="Любой сезон" />
      <Chips list={LAYERS} value={layer} onChange={setLayer} all="Всё" />
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <Chips list={cats.map((x) => ({ id: x, label: x }))} value={cat} onChange={setCat} all="Любая категория" />
        <Button variant="ghost" type="button" onClick={addCat} className="shrink-0 self-start rounded-full border-2 border-dashed border-border px-3 py-1 text-sm">+ Категория</Button>
      </div>
      {colors.length > 0 && <select aria-label="Фильтр по цвету" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 max-w-xs rounded-md border-2 border-border bg-card px-2 text-sm"><option value="">Любой цвет</option>{colors.map((x) => <option key={x} value={x}>{x}</option>)}</select>}
      <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="Размер или рост, например 86" className="max-w-xs" />

      {q.isError ? <p className="text-sm text-destructive">Не удалось открыть гардероб. <Button variant="link" onClick={() => void q.refetch()}>Повторить</Button></p> : q.isLoading ? <p className="text-sm text-muted-foreground">Розитта открывает шкаф…</p> : shown.length === 0 ? (
        <p className="rounded-lg border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">{clothes.length ? "Под эти фильтры ничего нет." : "Шкаф пока пуст. Сфотографируйте первую вещь."}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {shown.map((c) => (
            <article key={c.id} className="overflow-hidden rounded-lg border-2 border-border bg-card">
            <Button variant="ghost" type="button" onClick={() => setDraft({ ...c, photo: null })} className="block h-auto w-full whitespace-normal p-0 text-left">
              <div className="aspect-square bg-muted">{c.photo_url ? <img src={c.photo_url} alt={c.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center text-4xl">{LAYERS.find((l) => l.id === c.layer)?.icon}</div>}</div>
              <div className="space-y-0.5 p-2">
                <p className="line-clamp-2 text-sm font-medium">{c.name || "Без названия"}</p>
                <p className="text-xs text-muted-foreground">{STATUSES.find((s) => s.id === c.status)?.icon} {SEASONS.find((s) => s.id === c.season)?.icon}{c.size ? ` · ${c.size}` : ""}{c.owner ? ` · ${c.owner}` : ""}</p>
                {c.box_id && <p className="text-xs text-muted-foreground">📦 Сундук №{d.boxes.find((b) => b.id === c.box_id)?.number ?? "?"}</p>}
              </div>
            </Button>
            <div className="p-2 pt-0"><ClothStorage cloth={c} token={token} boxes={d.boxes} /></div>
            </article>
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
    if (!f.name.trim()) { toast.error("Дайте вещи название"); return; }
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
        <Button variant="ghost" type="button" onClick={() => file.current?.click()} className="grid h-auto p-0 aspect-[4/3] w-full place-items-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted">
          {f.photo_url ? <img src={f.photo_url} alt="" className="h-full w-full object-cover" /> : <span className="flex items-center gap-2 text-sm"><Camera />Сфотографировать</span>}
        </Button>
        {busy === "ai" && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Розитта разглядывает вещь…</p>}
        <Input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Что это? Например: мятный комбинезон" />
        <p className="text-xs text-muted-foreground">Чьё</p>
        <Chips list={people.map((p) => ({ id: p, label: p }))} value={f.owner} onChange={(v) => set({ owner: v })} all="Общее" />
        <Chips list={LAYERS} value={f.layer} onChange={(v) => set({ layer: v })} />
        <Chips list={SEASONS} value={f.season} onChange={(v) => set({ season: v })} />
        <Chips list={STATUSES} value={f.status} onChange={(v) => set({ status: v, ...(v === "closet" ? { box_id: null } : {}) })} />
        <Input value={f.size} onChange={(e) => set({ size: e.target.value })} placeholder="Размер или рост: 86, 104-110, M, 42" />
        <Input value={f.color} onChange={(e) => set({ color: e.target.value })} placeholder="Цвет: чёрный, мятный…" />
        <Input value={f.category} onChange={(e) => set({ category: e.target.value })} list="cloth-cats" placeholder="Своя категория: пижамы, спорт…" />
        <datalist id="cloth-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
        {looks.length > 0 && <p className="text-xs text-muted-foreground">✨ Входит в образы: {looks.join(", ")}</p>}
        <select value={f.box_id ?? ""} onChange={(e) => set(clothDestination(f.status, e.target.value || null))} className="h-10 w-full rounded-md border-2 border-border bg-card px-2 text-sm">
          <option value="">Не в сундуке</option>
          {d.boxes.map((b) => <option key={b.id} value={b.id}>📦 №{b.number}{b.note ? ` — ${b.note.slice(0, 40)}` : ""}{b.location ? ` (${b.location})` : ""}</option>)}
        </select>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={save} disabled={!!busy || !f.name.trim()}>{busy === "save" ? "Сохраняю…" : "Сохранить"}</Button>
          {f.id && <Button variant="ghost" size="icon" onClick={remove} aria-label="Удалить"><Trash2 /></Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Looks({ outfits, clothes, owner, onOpen }: { outfits: Outfit[]; clothes: Cloth[]; owner: string; onOpen: (o: Outfit) => void }) {
  const list = outfits.filter((o) => !owner || o.owner === owner);
  if (!list.length) return <p className="rounded-lg border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">Образов пока нет. Сфотографируйтесь в зеркале или разложите вещи, затем отметьте, что на фото.</p>;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {list.map((o) => {
        const items = selectedClothes(clothes, o.cloth_ids);
        return (
          <Button variant="ghost" key={o.id} type="button" onClick={() => onOpen(o)} className="block h-auto whitespace-normal p-0 overflow-hidden rounded-lg border-2 border-border bg-card text-left">
            <div className="aspect-square bg-muted">{o.photo_url ? <img src={o.photo_url} alt={o.name} className="h-full w-full object-cover" loading="lazy" /> : (
              <div className="grid h-full grid-cols-2 gap-0.5">{items.slice(0, 4).map((c) => c.photo_url ? <img key={c.id} src={c.photo_url} alt="" className="h-full w-full object-cover" /> : <div key={c.id} className="grid place-items-center text-2xl">{LAYERS.find((l) => l.id === c.layer)?.icon}</div>)}</div>
            )}</div>
            <div className="p-2"><p className="line-clamp-2 text-sm font-medium">{o.name || "Без названия"}</p><p className="text-xs text-muted-foreground">{o.kind === "capsule" ? "🧳" : "✨"} {items.length} вещ.{o.owner ? ` · ${o.owner}` : ""}</p></div>
          </Button>
        );
      })}
    </div>
  );
}

function LookDialog({ look, clothes, people, token, onClose, onSaved }: { look: Partial<Outfit>; clothes: Cloth[]; people: string[]; token: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(look.name ?? "");
  const [owner, setOwner] = useState(look.owner ?? "");
  const [ids, setIds] = useState<string[]>(selectedClothes(clothes, look.cloth_ids ?? []).map((c) => c.id));
  const [kind, setKind] = useState<"look" | "capsule">(look.kind ?? "look");
  const [packed, setPacked] = useState<string[]>(look.packed_ids ?? []);
  const [search, setSearch] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const shown = photo ?? look.photo_url ?? null;
  const pool = clothes.filter((c) => (!owner || c.owner === owner || !c.owner || ids.includes(c.id)) && matchesAll(`${c.name} ${c.category} ${c.color} ${c.size}`, normSearch(search)));
  const toggle = (id: string) => setIds((x) => x.includes(id) ? x.filter((y) => y !== id) : [...x, id]);
  async function save() {
    if (!name.trim() || !ids.length) return;
    setBusy(true);
    try { await saveOutfit({ data: { token, id: look.id, name: name.trim(), owner, kind, cloth_ids: ids, packed_ids: packed.filter((id) => ids.includes(id)), photo } }); onSaved(); onClose(); toast.success("Образ сохранён"); }
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
        <input ref={file} type="file" accept="image/*" hidden onChange={async (e) => { const input = e.currentTarget; const x = input.files?.[0]; if (x) { try { setPhoto(await compressImage(x, 1024)); } catch { toast.error("Не удалось открыть фото"); } } input.value = ""; }} />
        <Button variant="ghost" type="button" onClick={() => file.current?.click()} className="grid h-auto p-0 aspect-[4/3] w-full place-items-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted">
          {shown ? <img src={shown} alt="" className="h-full w-full object-cover" /> : <span className="flex items-center gap-2 text-sm"><Camera />Фото в зеркале (можно без)</span>}
        </Button>
        <div className="flex gap-2"><Button variant={kind === "look" ? "default" : "secondary"} onClick={() => setKind("look")}>✨ Образ</Button><Button variant={kind === "capsule" ? "default" : "secondary"} onClick={() => setKind("capsule")}>🧳 Капсула</Button></div>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название: В театр, Поездка в Питер…" />
        <Chips list={people.map((p) => ({ id: p, label: p }))} value={owner} onChange={setOwner} all="Общее" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Найти вещь для образа…" />
        <p className="text-sm">Вещи: {ids.length}</p>
        <div className="grid grid-cols-3 gap-1.5">
          {pool.map((c) => {
            const on = ids.includes(c.id);
            return (
              <Button variant="ghost" key={c.id} type="button" onClick={() => toggle(c.id)} aria-pressed={on} className={`relative block h-auto whitespace-normal p-0 overflow-hidden rounded-md border-2 text-left ${on ? "border-primary" : "border-border opacity-70"}`}>
                {c.photo_url ? <img src={c.photo_url} alt="" className="aspect-square w-full object-cover" /> : <div className="grid aspect-square place-items-center text-2xl">{LAYERS.find((l) => l.id === c.layer)?.icon}</div>}
                <p className="line-clamp-1 p-1 text-[11px]">{c.name || "Без названия"}</p>
                {on && <span className="absolute right-1 top-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">✓</span>}
              </Button>
            );
          })}
          {!pool.length && <p className="col-span-3 text-sm text-muted-foreground">Сначала добавьте вещи на вкладке «Вещи».</p>}
        </div>
        {kind === "capsule" && ids.length > 0 && <section className="space-y-2"><h3 className="text-sm font-semibold">В чемодане · {packed.filter((id) => ids.includes(id)).length}/{ids.length}</h3>{selectedClothes(clothes, ids).map((c) => <label key={c.id} className="flex items-center gap-2 text-sm"><Checkbox checked={packed.includes(c.id)} onCheckedChange={(checked) => setPacked((x) => checked ? [...new Set([...x, c.id])] : x.filter((id) => id !== c.id))} />{c.name}</label>)}</section>}
        <div className="flex gap-2">
          <Button className="flex-1" onClick={save} disabled={busy || !name.trim() || !ids.length}>{busy ? "Сохраняю…" : "Сохранить"}</Button>
          {look.id && <Button variant="ghost" size="icon" onClick={remove} aria-label="Удалить"><Trash2 /></Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
