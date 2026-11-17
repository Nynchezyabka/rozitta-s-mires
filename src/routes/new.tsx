import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, ClipboardPaste, Copy } from "lucide-react";
import { toast } from "sonner";
import { PhotoStrip } from "@/components/PhotoStrip";
import { CreateGroup } from "@/components/CreateGroup";
import { MAX_PHOTOS } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { ItemsEditor, GroupPicker, isLater, isKids, KidsPicker, LocationInput, type EditItem } from "@/components/BoxParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImage, type HouseholdData } from "@/lib/household";
import { saveBox } from "@/lib/store";
import { recognizePhoto } from "@/lib/store.functions";
import { matchGroup, GROUP_COLORS } from "@/lib/defaults";
import { normTag } from "@/lib/tags";
import { suggestIcons } from "@/lib/icons";
import { getHousehold, saveGroup } from "@/lib/store";
import { RozittaBubble } from "@/components/RozittaBubble";
import { BREWING, sfx } from "@/lib/rozitta";
import { cancelLocal, getAiKey, getService, isAiConfigured, recognizeWithKey } from "@/lib/ai-key";
import { parsePasted, pastePrompt } from "@/lib/paste-list";
import { Textarea } from "@/components/ui/textarea";
import { useBlocker } from "@tanstack/react-router";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/new")({
  validateSearch: (s: Record<string, unknown>): { place?: string } => (typeof s['place'] === "string" ? { place: s['place'] } : {}),
  head: () => ({
    meta: [
      { title: "Новый сундук · Топи Розитты" },
      { name: "description", content: "Сфотографируйте открытый сундук или книги — список появится сам." },
      { property: "og:title", content: "Новый сундук · Топи Розитты" },
      { property: "og:description", content: "Сфотографируйте открытый сундук или книги — список появится сам." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AppShell>{(d, t) => <Wizard d={d} token={t} />}</AppShell>,
});

function Steps({ n }: { n: number }) {
  return (
    <div className="flex gap-1.5 py-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= n ? "bg-primary" : "bg-muted"}`} />
      ))}
    </div>
  );
}

function Wizard({ d, token }: { d: HouseholdData; token: string }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const mode = "box" as const;
  const [photos, setPhotos] = useState<string[]>([]);
  const photo = photos[0] ?? null;
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<EditItem[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [decideBy, setDecideBy] = useState("");
  const [kidSize, setKidSize] = useState("");
  const [kidSeason, setKidSeason] = useState("");
  const [place, setPlace] = useState(Route.useSearch().place ?? "");
  const [pasting, setPasting] = useState(false);
  const [newGroup, setNewGroup] = useState<string | null>(null);
  const createSuggested = async () => {
    if (!newGroup) return;
    setBusy(true);
    try {
      await saveGroup({ data: { token, name: newGroup, color: GROUP_COLORS[d.groups.length % GROUP_COLORS.length]!, icon: suggestIcons(newGroup)[0] ?? "📦", position: d.groups.length } });
      const fresh = await getHousehold({ data: { token } });
      qc.setQueryData(["household", token], fresh);
      const g = fresh.groups.find((x) => x.name === newGroup);
      if (g) setGroupId(g.id);
      setNewGroup(null);
      toast.success(`Группа «${newGroup}» готова`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const [pasted, setPasted] = useState("");
  const [aiReady, setAiReady] = useState(false);
  const [local, setLocalMode] = useState(false);
  useEffect(() => { setAiReady(isAiConfigured()); setLocalMode(getService()?.id === "local"); }, []);
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!busy || !local) { setSecs(0); return; }
    const t = setInterval(() => setSecs((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [busy, local]);
  const localWait = busy && local && step !== 3 && (
    <div className="space-y-2 rounded-2xl bg-card p-3 text-base">
      <p>Модель думает: {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</p>
      <p className="text-sm text-muted-foreground">
        {secs < 120 ? "На домашнем компьютере это обычно 1–3 минуты." : "Долго — значит, вещей много. Можно подождать (до 5 минут) или отменить."}
      </p>
      <Button variant="secondary" className="w-full rounded-2xl" onClick={cancelLocal}>Отменить</Button>
    </div>
  );

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(pastePrompt(mode));
      toast.success("Подсказка скопирована");
    } catch {
      toast.error("Не получилось скопировать — выделите текст подсказки вручную");
    }
  };
  const applyPasted = () => {
    const r = parsePasted(pasted, mode);
    if (!r.items.length) { toast("Список пустой — вставьте ответ ИИ"); return; }
    setItems((prev) => [...prev, ...r.items.map((x) => ({ name: x.name, author: x.author, needs_review: false, kind: "item", category: null }) as EditItem)]);
    if (r.duplicates.length) toast(`Повторяются: ${r.duplicates.join(", ")}`);
    setPasting(false);
    setPasted("");
    setStep(2);
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    sfx.bubble();
    try {
      const img = await compressImage(f, local ? 1024 : undefined);
      const first = !photo;
      setPhotos((p) => (p.length < MAX_PHOTOS ? [...p, img] : p));
      const key = getAiKey();
      const r = isAiConfigured()
        ? await recognizeWithKey(key, img, mode, d.groups.map((g) => g.name))
        : await recognizePhoto({ data: { token, photo: img, mode } });
      const found = r.items.map((x) => ({ name: x.name, author: x.author ?? null, needs_review: !!x.needs_review, kind: x.author ? "book" : "item", category: normTag(x.category) }) as EditItem);
      setItems((prev) => {
        const have = new Set(prev.map((p) => p.name.toLowerCase()));
        return [...prev, ...found.filter((f) => !have.has(f.name.toLowerCase()))];
      });
      if (first || !groupId) {
        setGroupId(matchGroup(d.groups, r.group)?.id ?? null);
        const s = normTag(r.group);
        const known = s && d.groups.some((g) => g.name.toLowerCase() === s.toLowerCase() || g.name.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(g.name.toLowerCase()));
        setNewGroup(s && !known && !/^разное$/i.test(s) ? s : null);
      }
      if (!r.items.length) toast("Ничего не нашлось — добавьте вещи вручную");
      else if (!first) toast.success(`Добавлено из нового фото: ${found.length}`);
    } catch (e) {
      toast.error((e as Error).message);
      setItems([]);
    } finally {
      setBusy(false);
      setStep(2);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const r = await saveBox({ data: { token, group_id: groupId, photos, items, decide_by: decideBy || null, kid_size: isKids(group) ? kidSize : null, kid_season: isKids(group) ? kidSeason : null, location: place } });
      await qc.invalidateQueries({ queryKey: ["household", token] });
      sfx.key();
      toast.success("Сундучок заперт на волшебный ключ");
      nav({ to: "/box/$id", params: { id: r.id } });
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  const group = d.groups.find((g) => g.id === groupId);
  const dirty = !busy && (!!photo || items.some((i) => i.name.trim()) || !!pasted.trim());
  const blocker = useBlocker({ shouldBlockFn: () => dirty, enableBeforeUnload: () => dirty, withResolver: true });

  return (
    <div className="space-y-5">
      <Steps n={step} />
      <AlertDialog open={blocker.status === "blocked"}>
        <AlertDialogContent className="border-2 border-primary/60 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Закрыть без сохранения?</AlertDialogTitle>
            <AlertDialogDescription>Сундук ещё не заперт — фото и список вещей пропадут.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>Остаться</AlertDialogCancel>
            <AlertDialogAction onClick={() => blocker.proceed?.()}>Закрыть</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      {busy && step === 1 && <RozittaBubble phrases={BREWING} />}
      {step === 1 && (
        <div className="space-y-5">
          <h1 className="font-display text-2xl font-bold">Сфотографируйте</h1>
          <p className="rounded-2xl bg-card/90 p-3 text-base">
            Снимите коробку, полку или вещи сверху при хорошем свете. Лучше до 10–15 вещей на одном фото — так всё видно и быстрее. Розитта сама поймёт, где книги, где лекарства, а где всё остальное. Если заполнен <Link to="/settings" className="underline">профиль здоровья</Link>, лекарства получат метку 🟢🟡🔴.
          </p>
          {localWait}
          {!aiReady && !pasting && (
            <p className="rounded-2xl bg-card p-3 text-sm">Своего ИИ пока нет — проще всего «Вставить список»: сфотографируйте в любом ИИ-чате и вставьте ответ.</p>
          )}
          {pasting ? (
            <div className="space-y-3 rounded-2xl bg-card p-4">
              <p className="text-sm">Сфотографируйте сундук в любом ИИ-приложении (Gemini, Claude, ChatGPT, Google Lens) и попросите: перечисли вещи списком, по одной на строку. Скопируйте ответ и вставьте сюда.</p>
              <Button variant="secondary" className="w-full rounded-2xl" onClick={copyPrompt}><Copy className="h-4 w-4" /> Скопировать подсказку для ИИ</Button>
              <Textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={10} placeholder={"Полотенца, 4 шт\nФен"} className="text-base" />
              <Button className="h-14 w-full rounded-2xl text-base" onClick={applyPasted}>Разобрать список</Button>
              <button className="w-full text-sm text-muted-foreground" onClick={() => setPasting(false)}>← назад</button>
            </div>
          ) : (
            <div className={`flex gap-2 ${aiReady ? "flex-col" : "flex-col-reverse"}`}>
              <Button variant={aiReady ? "default" : "secondary"} className={`${aiReady ? "h-20 text-lg" : "h-14"} w-full rounded-3xl font-display`} disabled={busy} onClick={() => fileRef.current?.click()}>
                <Camera className="h-6 w-6" /> {busy ? (local ? "Модель думает…" : "Смотрю, что внутри…") : "Сделать фото"}
              </Button>
              <Button variant={aiReady ? "secondary" : "default"} className={`${aiReady ? "h-14" : "h-20 text-lg"} w-full rounded-3xl font-display`} disabled={busy} onClick={() => setPasting(true)}>
                <ClipboardPaste className="h-6 w-6" /> Вставить список
              </Button>
            </div>
          )}
          <button className="w-full text-center text-sm text-muted-foreground underline" onClick={() => setStep(2)}>
            Без фото, вписать вручную
          </button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <h1 className="font-display text-2xl font-bold">Всё верно?</h1>
          {photo && <img src={photo} alt="" className="max-h-56 w-full rounded-2xl object-cover" />}
          <PhotoStrip value={photos} onChange={setPhotos} />
          <Button variant="secondary" className="h-12 w-full rounded-2xl" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Camera className="h-5 w-5" /> {busy ? (local ? "Модель думает…" : "Смотрю…") : "Распознать новое фото"}
          </Button>
          {localWait}
          <ItemsEditor items={items} onChange={setItems} />
          <Button className="h-14 w-full rounded-2xl text-base" onClick={() => setStep(3)}>
            Дальше
          </Button>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <h1 className="font-display text-2xl font-bold">Какая группа?</h1>
          {newGroup ? (
            <div className="space-y-2 rounded-2xl bg-card p-3">
              <p className="text-base">🐸 Кажется, для этого сундука нужна новая группа: <b>{newGroup}</b></p>
              <Button className="h-12 w-full rounded-2xl" disabled={busy} onClick={createSuggested}>+ Создать «{newGroup}»</Button>
            </div>
          ) : group && <p className="text-sm text-muted-foreground">Предлагаю: {group.icon} {group.name}</p>}
          <GroupPicker groups={d.groups} value={groupId} onChange={setGroupId} />
          <CreateGroup groups={d.groups} token={token} onCreated={setGroupId} />
          {isKids(group) && <KidsPicker size={kidSize} season={kidSeason} onSize={setKidSize} onSeason={setKidSeason} />}
        <h2 className="pt-2 font-semibold">Где стоит</h2>
        <p className="text-xs text-muted-foreground">Можно путём: Спальня / Шкаф / Полка 3</p>
        <LocationInput value={place} onChange={setPlace} known={d.boxes.map((b) => b.location)} />
          <label className="block space-y-1">
              <span className="text-sm font-medium">{isLater(group) ? "Решить до" : "Срок годности / пересмотреть до (необязательно)"}</span>
              <Input type="date" value={decideBy} onChange={(e) => setDecideBy(e.target.value)} className="h-12" />
            </label>
          <Button className="h-14 w-full rounded-2xl text-base" disabled={busy} onClick={save}>
            {busy ? "Сохраняю…" : "Запереть сундучок"}
          </Button>
          <button className="w-full text-sm text-muted-foreground" onClick={() => setStep(2)}>
            ← назад к списку
          </button>
        </div>
      )}
    </div>
  );
}
