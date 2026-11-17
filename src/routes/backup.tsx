import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { download, readDevice, toCsv, toJson } from "@/lib/backup";
import { applyBackup, parseBackup, planRestore, type Backup } from "@/lib/restore";
import { Switch } from "@/components/ui/switch";
import { APP_VERSION, checkForUpdates, hardReload, lastBackup, markBackup } from "@/lib/updates";
import type { HouseholdData } from "@/lib/store";

const T = "Копия и обновления · Топи Розитты";
const D = "Сохранить и восстановить копию дома, проверить новую версию приложения.";
export const Route = createFileRoute("/backup")({
  head: () => ({ meta: [
    { title: T }, { name: "description", content: D }, { property: "og:title", content: T },
    { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <AppShell>{(d, t) => <BackupPage d={d} token={t} />}</AppShell>,
});

function BackupPage({ d, token }: { d: HouseholdData; token: string }) {
  const qc = useQueryClient();
  const day = new Date().toISOString().slice(0, 10);
  const link = typeof window !== "undefined" ? `${location.origin}/join/${token}` : "";
  const [last, setLast] = useState<number | null>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [withDevice, setWithDevice] = useState(false);
  const [restoreDevice, setRestoreDevice] = useState(true);
  const [askReload, setAskReload] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const plan = pending ? planRestore(d, pending) : null;
  useEffect(() => setLast(lastBackup()), []);
  const save = (name: string, text: string, type: string) => { download(name, text, type); markBackup(); setLast(Date.now()); toast.success("Копия сохранена 🐸"); };

  const restore = async () => {
    if (!pending) return;
    const b = pending; setPending(null); setProgress("Розитта раскладывает…");
    try {
      const plan = await applyBackup(token, b, (n, t) => setProgress(`Раскладываю ${n} из ${t}…`), restoreDevice);
      await qc.invalidateQueries();
      toast.success(`Возвращено: сундуков ${plan.add.length}, заметок ${plan.notes.length}${plan.same ? `; уже были: ${plan.same}` : ""}`);
      if (plan.skipped?.length) toast.warning(`Номера ${plan.skipped.join(", ")} заняты сундуками из корзины — эти сундуки не вернулись`);
    } catch (e) { toast.error((e as Error).message); } finally { setProgress(null); }
  };

  return (
    <div className="space-y-6 pt-2">
      <h1 className="font-display text-xl text-primary">💾 Копия и обновления</h1>

      <section className="space-y-3">
        <p className="text-muted-foreground">Все сундуки ({d.boxes.length}), вещи ({d.items.length}), группы и заметки — в файл на этом устройстве. Фото в копию не входят.</p>
        <p className="text-sm text-muted-foreground">{last ? `Последняя копия: ${new Date(last).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}.` : "С этого устройства копию ещё не сохраняли."} Раз в месяц Розитта напомнит.</p>
        <Button className="h-14 w-full rounded-2xl text-base" onClick={() => save(`topi-rozitty-${day}.json`, toJson(d, withDevice ? readDevice() : undefined), "application/json")}>Полная копия (JSON)</Button>
        <label className="flex items-center justify-between gap-3 rounded-2xl bg-card p-3 text-sm">
          <span>Включить настройки на этом устройстве <span className="block text-xs text-muted-foreground">прогресс сада и профиль здоровья; ключ ИИ не входит</span></span>
          <Switch checked={withDevice} onCheckedChange={setWithDevice} />
        </label>
        <Button variant="secondary" className="h-14 w-full rounded-2xl text-base" onClick={() => save(`topi-rozitty-${day}.csv`, toCsv(d), "text/csv;charset=utf-8")}>Таблица вещей (CSV)</Button>
        <Button variant="outline" className="w-full rounded-2xl" disabled={!!progress} onClick={() => file.current?.click()}>{progress ?? "Восстановить из копии (JSON)"}</Button>
        <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = "";
          if (!f) return;
          try { setPending(parseBackup(await f.text())); } catch (err) { toast.error((err as Error).message); }
        }} />
      </section>

      <div className="space-y-2 rounded-2xl border-2 border-accent/60 bg-card p-4 text-sm">
        <p>🗝 Сохраните ссылку-ключ дома: без неё доступ не вернуть.</p>
        <Button variant="outline" className="w-full" onClick={async () => { await navigator.clipboard.writeText(link); toast.success("Ссылка-ключ скопирована"); }}>Скопировать ссылку-ключ</Button>
      </div>

      <section className="space-y-2 rounded-2xl bg-card p-4 text-sm">
        <h2 className="font-display text-[12px] text-primary">Обновления · версия {APP_VERSION}</h2>
        <p className="text-muted-foreground">Новая версия приходит сама: Розитта предложит «Обновить». Удалять приложение или чистить браузер не нужно — так пропадёт ключ дома.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={checking} onClick={async () => {
            setChecking(true); const r = await checkForUpdates(); setChecking(false);
            if (r === "new") toast("Есть новая версия", { action: { label: "Обновить", onClick: () => void hardReload() } });
            else toast(r === "offline" ? "Нет связи — проверим позже" : "У вас свежая версия 🐸");
          }}>{checking ? "Смотрю…" : "Проверить"}</Button>
          <Button variant="secondary" onClick={() => setAskReload(true)}>Начисто</Button>
        </div>
      </section>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вернуть вещи из копии?</AlertDialogTitle>
            <AlertDialogDescription>В копии: сундуков {pending?.boxes.length}, вещей {pending?.items.length}, заметок {pending?.notes.length}. Сундуки вернутся с прежними номерами — старые наклейки с QR снова заработают. То, что уже есть, не тронется.</AlertDialogDescription>
          </AlertDialogHeader>
          {plan && plan.same > 0 && <p className="text-sm text-muted-foreground">Уже на месте: {plan.same} — их пропущу.</p>}
          {plan && plan.conflicts.length > 0 && <p className="rounded-xl border-2 border-destructive p-3 text-sm text-destructive">Номера {plan.conflicts.join(", ")} уже заняты в этом доме другими сундуками. Так восстановить нельзя: перенесите эти сундуки или восстановите копию в новый пустой дом.</p>}
          {pending?.device && <label className="flex items-center justify-between gap-3 text-sm"><span>Вернуть сад и профиль здоровья на это устройство</span><Switch checked={restoreDevice} onCheckedChange={setRestoreDevice} /></label>}
          <AlertDialogFooter><AlertDialogCancel>Не надо</AlertDialogCancel><AlertDialogAction disabled={!plan || plan.conflicts.length > 0} onClick={restore}>Вернуть</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={askReload} onOpenChange={setAskReload}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Перезагрузить начисто?</AlertDialogTitle>
            <AlertDialogDescription>Помогает, если приложение «залипло» на старой версии. Сундуки, ключ дома и настройки сохранятся.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Не надо</AlertDialogCancel><AlertDialogAction onClick={() => void hardReload()}>Перезагрузить</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
