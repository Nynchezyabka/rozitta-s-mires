import { useEffect, useState } from "react";
import { DoorClosed, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Coach } from "@/components/Coach";
import { GardenScene } from "@/components/GardenScene";
import { addBloom, addGardenLog, getGarden, getGardenLog, getNight, setNightPref, type GardenLogEntry } from "@/lib/coach";
import { gardenRewardAt, type GardenId } from "@/lib/garden";
import { sfx } from "@/lib/rozitta";
import door from "@/assets/garden-door.jpg";
import key from "@/assets/garden-key.png";

export function SecretGarden() {
  const [open, setOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [fresh, setFresh] = useState<GardenId | null>(null);
  const [earned, setEarned] = useState("");
  const [night, setNight] = useState(false);
  const [hop, setHop] = useState(0);
  const [log, setLog] = useState<GardenLogEntry[]>([]);
  const toggleNight = () => { setNight(!night); setNightPref(!night); };
  useEffect(() => {
    setNight(getNight());
    setLog(getGardenLog());
    const refresh = () => setTotal(getGarden());
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  const done = (what: string) => {
    const count = addBloom();
    const plant = gardenRewardAt(count - 1);
    setTotal(count);
    setFresh(plant.id);
    setEarned(plant.name);
    setLog(addGardenLog({ at: Date.now(), what: what || "Шаг к порядку", plant: plant.name }));
    setHop(count);
    sfx.key();
    setTimeout(() => sfx.quack(), 350);
    toast.success(`В саду теперь: ${plant.name}`);
  };

  if (!open) return (
    <section className="garden-entrance -mx-4 mt-2">
      <img src={door} alt="Старинная дверь в каменной стене, увитая плющом" width={1024} height={1280} className="pixel absolute inset-0 h-full w-full object-cover" />
      <div className="garden-door-shade" />
      <h1 className="absolute inset-x-4 top-7 text-center font-display text-base leading-loose text-foreground">Таинственный сад</h1>
      <div className="absolute inset-x-4 bottom-6 flex flex-col items-center gap-3">
        <Button variant="outline" onClick={() => { setOpen(true); sfx.key(); }} className="garden-unlock h-16 gap-3 border-garden-gold/70 bg-background/90 px-6 text-base text-garden-gold">
          <img src={key} alt="" width={816} height={816} className="pixel h-12 w-12" />Открыть сад
        </Button>
        <p className="max-w-xs text-center text-xs text-foreground/90">{total ? `Шагов к порядку: ${total}` : "Здесь любое дело для порядка превращается в растение."}</p>
      </div>
    </section>
  );

  return (
    <section className="garden-open pt-4">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-sm leading-relaxed text-primary">Таинственный сад</h1>
          <p className="mt-2 text-xs text-muted-foreground">Шагов к порядку: <span data-testid="garden-total">{total}</span> · каждый дарит саду растение</p>
        </div>
        <div className="flex shrink-0">
        <Button variant="ghost" size="icon" aria-label={night ? "Дневной сад" : "Ночной сад"} title={night ? "Дневной сад" : "Ночной сад"} onClick={toggleNight}>{night ? <Sun /> : <Moon />}</Button>
        <Button variant="ghost" size="icon" aria-label="Закрыть дверь сада" title="Закрыть дверь сада" onClick={() => setOpen(false)}><DoorClosed /></Button>
        </div>
      </header>
      <div className="-mx-4"><GardenScene total={total} fresh={fresh} night={night} hop={hop} /></div>
      {earned && <p className="mt-3 text-sm text-primary" role="status">Выросло: {earned}</p>}
      <Coach onDone={done} />
      {log.length > 0 && (
        <section aria-label="Последние шаги" className="border-t border-border/60 py-3">
          <h2 className="mb-2 text-sm font-semibold">Последние шаги</h2>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {log.map((e) => <li key={e.at}>{new Date(e.at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} — {e.what} → <span className="text-primary">{e.plant}</span></li>)}
          </ul>
        </section>
      )}
    </section>
  );
}