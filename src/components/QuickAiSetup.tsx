import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SERVICES, detectService, setAiKey, setService, testKey, type ServiceId } from "@/lib/ai-key";

const WHERE: { id: ServiceId; title: string; note: string; url: string }[] = [
  { id: "gemini", title: "Google Gemini", note: "бесплатный ключ за минуту, из России нужен VPN", url: "https://aistudio.google.com/apikey" },
  { id: "cnc", title: "Claude n Codex", note: "работает без VPN", url: "https://claude-n-codex.com" },
  { id: "openrouter", title: "OpenRouter", note: "доступ к разным нейросетям", url: "https://openrouter.ai/keys" },
];

/** One-time AI setup right on the photo step, so nobody has to dig into settings. */
export function QuickAiSetup({ onReady }: { onReady: () => void }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [svc, setSvc] = useState<ServiceId | null>(null);
  const [busy, setBusy] = useState(false);
  const chosen = svc ?? detectService(key)?.id ?? null;

  const enable = async () => {
    const s = SERVICES.find((x) => x.id === chosen);
    if (!key.trim()) { toast("Сначала вставьте ключ"); return; }
    if (!s) { toast("Подскажите, чей это ключ"); return; }
    setBusy(true);
    try {
      await testKey(key.trim(), s);
      setAiKey(key);
      setService(s.id);
      toast.success("Готово! Розитта теперь видит вещи на фото");
      setOpen(false);
      onReady();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-sm ${on ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`;

  return (
    <>
      <div className="space-y-3 rounded-2xl border-2 border-primary/50 bg-card p-4">
        <p className="text-sm">Чтобы Розитта сама узнавала вещи на фото, ей нужен доступ к нейросети. Настраивается один раз.</p>
        <Button className="h-12 w-full rounded-2xl" onClick={() => setOpen(true)}><Sparkles className="h-5 w-5" /> Подключить распознавание по фото</Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-2 border-primary/60 bg-card">
          <DialogHeader>
            <DialogTitle>Глаза для Розитты</DialogTitle>
            <DialogDescription>Нужен ключ от нейросети — это как пароль. Он хранится только в этом браузере.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold">1. Возьмите ключ в одном из мест:</p>
              {WHERE.map((w) => (
                <a key={w.id} href={w.url} target="_blank" rel="noreferrer" className="block rounded-xl bg-background p-3 text-sm hover:bg-secondary">
                  <span className="font-medium underline">{w.title}</span>
                  <span className="block text-xs text-muted-foreground">{w.note}</span>
                </a>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold">2. Вставьте его сюда:</p>
              <Input value={key} onChange={(e) => { setKey(e.target.value); setSvc(null); }} placeholder="Ключ" className="h-12 text-base" />
              {key && !detectService(key) && (
                <div className="space-y-2">
                  <p className="text-sm">Не узнала, чей ключ — подскажите:</p>
                  <div className="flex flex-wrap gap-2">
                    {WHERE.map((w) => <button key={w.id} type="button" className={chip(chosen === w.id)} onClick={() => setSvc(w.id)}>{w.title}</button>)}
                  </div>
                </div>
              )}
              {key && detectService(key) && <p className="text-sm">✅ Похоже на {detectService(key)?.name}</p>}
            </div>
            <Button className="h-12 w-full rounded-2xl" disabled={busy} onClick={enable}>{busy ? "Проверяю…" : "Проверить и включить"}</Button>
            <p className="text-center text-xs text-muted-foreground">
              Нейросеть на своём компьютере? <Link to="/settings" className="underline">Настроить в настройках</Link>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
