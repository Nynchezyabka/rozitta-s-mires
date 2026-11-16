import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, BookOpen, Package, ClipboardPaste, Copy } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ItemsEditor, GroupPicker, isLater, isKids, KidsPicker, LocationInput, type EditItem } from "@/components/BoxParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImage, type HouseholdData } from "@/lib/household";
import { saveBox } from "@/lib/store";
import { recognizePhoto } from "@/lib/store.functions";
import { matchGroup } from "@/lib/defaults";
import { RozittaBubble } from "@/components/RozittaBubble";
import { BREWING, sfx } from "@/lib/rozitta";
import { getAiKey, getService, isAiConfigured, recognizeWithKey } from "@/lib/ai-key";
import { parsePasted, pastePrompt } from "@/lib/paste-list";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/new")({
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
  const [mode, setMode] = useState<"box" | "books">("box");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<EditItem[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [decideBy, setDecideBy] = useState("");
  const [kidSize, setKidSize] = useState("");
  const [kidSeason, setKidSeason] = useState("");
  const [place, setPlace] = useState("");
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [aiReady, setAiReady] = useState(false);
  const [local, setLocalMode] = useState(false);
  useEffect(() => { setAiReady(isAiConfigured()); setLocalMode(getService()?.id === "local"); }, []);

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
    setItems((prev) => [...prev, ...r.items.map((x) => ({ name: x.name, author: x.author, needs_review: false, kind: mode === "books" ? "book" : "item" }) as EditItem)]);
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
      if (first) setPhoto(img);
      const key = getAiKey();
      const r = isAiConfigured()
        ? await recognizeWithKey(key, img, mode, d.groups.map((g) => g.name))
        : await recognizePhoto({ data: { token, photo: img, mode } });
      const found = r.items.map((x) => ({ name: x.name, author: x.author ?? null, needs_review: !!x.needs_review, kind: mode === "books" ? "book" : "item" }) as EditItem);
      setItems((prev) => {
        const have = new Set(prev.map((p) => p.name.toLowerCase()));
        return [...prev, ...found.filter((f) => !have.has(f.name.toLowerCase()))];
      });
      if (first || !groupId) setGroupId(matchGroup(d.groups, r.group)?.id ?? null);
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
      const r = await saveBox({ data: { token, group_id: groupId, photo, items, decide_by: decideBy || null, kid_size: isKids(group) ? kidSize : null, kid_season: isKids(group) ? kidSeason : null, location: place } });
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

  return (
    <div className="space-y-5">
      <Steps n={step} />
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      {busy && step === 1 && <RozittaBubble phrases={BREWING} />}
      {step === 1 && (
        <div className="space-y-5">
          <h1 className="font-display text-2xl font-bold">Сфотографируйте</h1>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["box", "Сундук с вещами", Package],
                ["books", "Книги", BookOpen],
              ] as const
            ).map(([m, label, Icon]) => (
              <button key={m} onClick={() => setMode(m)} className={`flex flex-col items-center gap-2 rounded-2xl border-2 bg-card p-4 ${mode === m ? "border-primary" : "border-transparent"}`}>
                <Icon className="h-7 w-7" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {mode === "books" ? "Обложки или корешки, чтобы названия читались. Старые книги могут распознаться хуже — пометим «проверить»." : "Откройте сундук и снимите сверху, при хорошем свете."}
          </p>
          {!aiReady && !pasting && (
            <p className="rounded-2xl bg-card p-3 text-sm">Своего ИИ пока нет — проще всего «Вставить список»: сфотографируйте в любом ИИ-чате и вставьте ответ.</p>
          )}
          {pasting ? (
            <div className="space-y-3 rounded-2xl bg-card p-4">
              <p className="text-sm">Сфотографируйте сундук в любом ИИ-приложении (Gemini, Claude, ChatGPT, Google Lens) и попросите: перечисли вещи списком, по одной на строку. Скопируйте ответ и вставьте сюда.</p>
              <Button variant="secondary" className="w-full rounded-2xl" onClick={copyPrompt}><Copy className="h-4 w-4" /> Скопировать подсказку для ИИ</Button>
              <Textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={10} placeholder={mode === "books" ? "Лоскутик и облако — Софья Прокофьева" : "Полотенца, 4 шт\nФен"} className="text-base" />
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
          <Button variant="secondary" className="h-12 w-full rounded-2xl" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Camera className="h-5 w-5" /> {busy ? (local ? "Модель думает…" : "Смотрю…") : "Ещё фото (следующий слой)"}
          </Button>
          <ItemsEditor items={items} onChange={setItems} />
          <Button className="h-14 w-full rounded-2xl text-base" onClick={() => setStep(3)}>
            Дальше
          </Button>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <h1 className="font-display text-2xl font-bold">Какая группа?</h1>
          {group && <p className="text-sm text-muted-foreground">Предлагаю: {group.icon} {group.name}</p>}
          <GroupPicker groups={d.groups} value={groupId} onChange={setGroupId} />
          {isKids(group) && <KidsPicker size={kidSize} season={kidSeason} onSize={setKidSize} onSeason={setKidSeason} />}
        <h2 className="pt-2 font-semibold">Где стоит</h2>
        <LocationInput value={place} onChange={setPlace} known={d.boxes.map((b) => b.location)} />
          {isLater(group) && (
            <label className="block space-y-1">
              <span className="text-sm font-medium">Решить до</span>
              <Input type="date" value={decideBy} onChange={(e) => setDecideBy(e.target.value)} className="h-12" />
            </label>
          )}
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
