import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { HealthProfile } from "@/components/HealthProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tags, ChevronRight } from "lucide-react";
import { soundOn, setSound, sfx } from "@/lib/rozitta";
import { MODELS, SERVICES, detectService, getAiKey, getLocal, getModel, getService, listLocalModels, setAiKey, setLocal, setModel, setService, testKey, type ServiceId } from "@/lib/ai-key";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Настройки · Топи Розитты" },
      { name: "description", content: "Группы сундуков, звуки, распознавание фото и профиль здоровья." },
      { property: "og:title", content: "Настройки · Топи Розитты" },
      { property: "og:description", content: "Группы сундуков, звуки, распознавание фото и профиль здоровья." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AppShell>{() => <Settings />}</AppShell>,
});

function Settings() {
  const [svc, setSvc] = useState<ServiceId>("cnc");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [model, setM] = useState("");
  const [url, setUrl] = useState("");
  const [lkey, setLkey] = useState("");
  const [found, setFound] = useState<string[]>([]);
  const [sounds, setSounds] = useState(true);
  useEffect(() => {
    setSounds(soundOn());
    setKey(getAiKey());
    const l = getLocal();
    setUrl(l.url); setLkey(l.key);
    const s = getService();
    if (s) setSvc(s.id);
  }, []);
  useEffect(() => { setM(svc === "local" ? getLocal().model : getModel(svc)); }, [svc]);
  const s = SERVICES.find((x) => x.id === svc);
  const guess = detectService(key);

  const check = async () => {
    if (!s) return;
    setBusy(true);
    try {
      if (svc === "local") {
        const list = await listLocalModels({ url, key: lkey });
        setFound(list);
        const m = model || (list.length === 1 ? list[0] ?? "" : "");
        setM(m);
        setLocal({ url, model: m, key: lkey });
        setService("local");
        if (!m) toast(list.length ? "Сервер найден! Выберите модель ниже" : "Сервер найден, но моделей в нём нет — загрузите модель");
        else if (list.length && !list.includes(m)) toast.error(`Сервер найден, но модели «${m}» в нём нет`);
        else toast.success(`Сервер найден, модель «${m}» на месте. Сохранено`);
      } else {
        setAiKey(key);
        setModel(svc, model);
        setService(svc);
        await testKey(key, s);
        toast.success(`${s.name}: работает, ключ сохранён`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-sm ${on ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`;

  return (
    <div className="space-y-5 py-4">
      <h1 className="font-display text-xl font-bold">Настройки</h1>
      <Button asChild variant="outline" className="h-auto min-h-14 w-full justify-start py-2 text-base"><Link to="/groups"><Tags /><span className="text-left">Группы сундуков<span className="block text-xs font-normal text-muted-foreground">папки для сундуков: «Сезонное», «Детское»…</span></span><ChevronRight className="ml-auto" /></Link></Button>
      <div className="flex items-center justify-between gap-3 border-b border-border py-3">
        <label htmlFor="sound-setting" className="font-medium">Звуки Розитты</label>
        <Switch id="sound-setting" checked={sounds} onCheckedChange={(on) => { setSounds(on); setSound(on); if (on) sfx.quack(); }} />
      </div>
      <details className="border-b border-border pb-4">
      <summary className="cursor-pointer py-3 text-base font-semibold">👁️ Глаза Розитты · распознавание фото</summary>
      <div className="space-y-5 pt-3">
      <p className="text-sm text-muted-foreground">
        Всё хранится только в этом браузере. Без настройки можно вставлять список из любого ИИ-чата.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setSvc(guess?.id ?? (svc === "local" ? "cnc" : svc))} className={`rounded-2xl border-2 bg-card p-3 text-sm font-medium ${svc !== "local" ? "border-primary" : "border-transparent"}`}>☁️ Облачный ключ</button>
        <button type="button" onClick={() => setSvc("local")} className={`rounded-2xl border-2 bg-card p-3 text-sm font-medium ${svc === "local" ? "border-primary" : "border-transparent"}`}>💻 Локальная модель</button>
      </div>
      {svc === "local" ? (
        <div className="space-y-3 rounded-2xl bg-card p-4">
          <p className="text-sm text-muted-foreground">LM Studio, Ollama или любой OpenAI-совместимый сервер. Модель должна понимать картинки.</p>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://my-pc.tailnet.ts.net или http://192.168.1.10:1234" className="h-12" />
          <Input value={model} onChange={(e) => setM(e.target.value)} placeholder="Название модели (пусто — покажу список)" className="h-12" />
          {found.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {found.map((m) => <button key={m} type="button" onClick={() => setM(m)} className={chip(model === m)}>{m}</button>)}
            </div>
          )}
          <Input value={lkey} onChange={(e) => setLkey(e.target.value)} placeholder="Ключ (необязательно)" className="h-12" />
        </div>
      ) : (
        <>
          <Input value={key} onChange={(e) => { const v = e.target.value; setKey(v); const g = detectService(v); if (g) setSvc(g.id); }} placeholder="Вставьте ключ" className="h-14 rounded-2xl text-base" />
          <div className="space-y-2 rounded-2xl bg-card p-4 text-sm">
            {key && !guess ? (
              <>
                <p>Не узнала сервис по ключу — подскажите, чей он:</p>
                <div className="flex flex-wrap gap-2">
                  {SERVICES.filter((x) => x.id !== "local").map((x) => <button key={x.id} type="button" onClick={() => setSvc(x.id)} className={chip(svc === x.id)}>{x.name}</button>)}
                </div>
              </>
            ) : key ? (
              <p>✅ {s?.name} · {s?.vpn ? "из России может понадобиться VPN" : "работает без VPN"}</p>
            ) : (
              <p className="text-muted-foreground">Подходят ключи Google Gemini, OpenRouter и Claude n Codex — сервис определится сам.</p>
            )}
          </div>
          {key && (
            <details className="rounded-2xl bg-card p-4">
              <summary className="cursor-pointer text-sm">Модель: <b>{model || MODELS[svc][0]}</b> · выбрать другую</summary>
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {MODELS[svc].map((m) => <button key={m} type="button" onClick={() => setM(m)} className={chip(model === m)}>{m}</button>)}
                </div>
                <Input value={model} onChange={(e) => setM(e.target.value)} placeholder="или впишите своё название" className="h-11" />
              </div>
            </details>
          )}
        </>
      )}
      <Button className="h-14 w-full rounded-2xl text-base" disabled={busy || (svc === "local" ? !url : !key)} onClick={check}>
        {busy ? "Проверяю…" : "Проверить и сохранить"}
      </Button>
      {svc !== "local" && getAiKey() && (
        <button className="w-full text-sm text-muted-foreground underline" onClick={() => { setAiKey(""); setKey(""); toast("Ключ удалён"); }}>
          Удалить ключ
        </button>
      )}
      </div>
      </details>
      <HealthProfile />
    </div>
  );
}
