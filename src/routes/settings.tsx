import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MODELS, detectService, getAiKey, getModel, setAiKey, setModel, testKey } from "@/lib/ai-key";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Настройки ИИ · Топи Розитты" },
      { name: "description", content: "Подключите свой ключ ИИ для распознавания вещей на фото." },
      { property: "og:title", content: "Настройки ИИ · Топи Розитты" },
      { property: "og:description", content: "Подключите свой ключ ИИ для распознавания вещей на фото." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AppShell>{() => <Settings />}</AppShell>,
});

function Settings() {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setKey(getAiKey()), []);
  const s = detectService(key);
  const [model, setM] = useState("");
  useEffect(() => { if (s) setM(getModel(s.id)); }, [s?.id]);

  const check = async () => {
    setBusy(true);
    try {
      setAiKey(key);
      if (s) setModel(s.id, model);
      await testKey(key);
      toast.success(`${s?.name}: работает, ключ сохранён`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 py-4">
      <h1 className="font-display text-2xl font-bold">Ваш ключ ИИ</h1>
      <p className="text-sm text-muted-foreground">
        Вставьте ключ — я сама пойму, от какого он сервиса. Ключ хранится только в этом браузере. Пока ключа нет, работает встроенный ИИ.
      </p>
      <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="AIza… / sk-myapi_… / sk-or-…" className="h-14 rounded-2xl text-base" />
      {key && (
        <div className="rounded-2xl bg-card p-4 text-sm">
          {s ? (
            <>
              Это <b>{s.name}</b>. {s.vpn ? "Из России может понадобиться VPN." : "Работает без VPN."}
            </>
          ) : (
            "Не узнаю ключ. Подходят: Google Gemini (AIza…), Claude n Codex (sk-myapi_…), OpenRouter (sk-or-…)."
          )}
        </div>
      )}
      {s && (
        <div className="space-y-2 rounded-2xl bg-card p-4">
          <p className="text-sm font-medium">Модель</p>
          <div className="flex flex-wrap gap-2">
            {MODELS[s.id].map((m) => (
              <button key={m} type="button" onClick={() => setM(m)} className={`rounded-full px-3 py-1.5 text-sm ${model === m ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{m}</button>
            ))}
          </div>
          <Input value={model} onChange={(e) => setM(e.target.value)} placeholder="или впишите своё название" className="h-11" />
        </div>
      )}
      <Button className="h-14 w-full rounded-2xl text-base" disabled={!s || busy} onClick={check}>
        {busy ? "Проверяю…" : "Проверить и сохранить"}
      </Button>
      {getAiKey() && (
        <button className="w-full text-sm text-muted-foreground underline" onClick={() => { setAiKey(""); setKey(""); toast("Ключ удалён"); }}>
          Удалить ключ
        </button>
      )}
    </div>
  );
}
