import { useEffect, useState } from "react";
import { DoorClosed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Coach } from "@/components/Coach";
import { GardenScene } from "@/components/GardenScene";
import { addBloom, addPotager, getPotager, addRoomStep, getRoomSteps, addGardenLog, getGarden, getGardenLog, type GardenLogEntry } from "@/lib/coach";
import { gardenRewardAt, isNightHour, isRoomOpen, roomRewardAt, ROOM_NAMES, ROOM_ORDER, ROOM_UNLOCK, type Room } from "@/lib/garden";

const LATER: Room[] = ["glasshouse", "grotto", "physick", "moor"];
const readLater = () => Object.fromEntries(LATER.map((r) => [r, getRoomSteps(r)])) as Record<Room, number>;
import { sfx } from "@/lib/rozitta";
import door from "@/assets/garden-door.jpg";
import key from "@/assets/garden-key.webp";

export function SecretGarden() {
  const [open, setOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [fresh, setFresh] = useState<string | null>(null);
  const [potager, setPotager] = useState(0);
  const [later, setLater] = useState<Record<Room, number>>({} as Record<Room, number>);
  const [room, setRoom] = useState<Room>("pond");
  const [earned, setEarned] = useState("");
  const [night, setNight] = useState(false);
  const [hop, setHop] = useState(0);
  const [log, setLog] = useState<GardenLogEntry[]>([]);
  useEffect(() => {
    const tick = () => setNight(isNightHour(new Date().getHours()));
    tick();
    const timer = window.setInterval(tick, 60000);
    setLog(getGardenLog());
    const refresh = () => { setTotal(getGarden()); setPotager(getPotager()); setLater(readLater()); };
    refresh();
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("storage", refresh); window.clearInterval(timer); };
  }, []);

  const laterSum = LATER.reduce((a, r) => a + (later[r] ?? 0), 0);
  const pond = Math.max(0, total - potager - laterSum);
  const steps = { ...later, pond, potager } as Record<Room, number>;
  const idx = ROOM_ORDER.indexOf(room);
  const prevRoom = ROOM_ORDER[idx - 1];
  const nextRoom = ROOM_ORDER[idx + 1];
  const nextOpen = nextRoom ? isRoomOpen(nextRoom, steps) : false;
  const go = (r: Room) => { setRoom(r); setFresh(null); setEarned(""); sfx.key(); };
  const pass = () => {
    if (room === "potager") { go("pond"); return; }
    if (!nextOpen) { toast(`Тропинка за аркой заросла плющом. Ещё ${ROOM_UNLOCK - pond} шагов к порядку — и путь расчистится.`); return; }
    go("potager");
  };
  const done = (what: string) => {
    const count = addBloom();
    let plant;
    if (room === "potager") { const n = addPotager(); setPotager(n); plant = roomRewardAt("potager", n - 1); }
    else if (room !== "pond") { const n = addRoomStep(room); setLater(readLater()); plant = roomRewardAt(room, n - 1); }
    else plant = gardenRewardAt(count - 1 - potager - laterSum);
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
        <Button variant="ghost" size="icon" aria-label="Закрыть дверь сада" title="Закрыть дверь сада" onClick={() => setOpen(false)}><DoorClosed /></Button>
        </div>
      </header>
      <div className="-mx-4"><GardenScene room={room} count={steps[room] ?? 0} fresh={fresh} night={night} hop={hop} unlocked={room === "pond" ? nextOpen : true} onPass={pass} /></div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        {prevRoom ? <Button variant="outline" size="sm" onClick={() => go(prevRoom)}>← {ROOM_NAMES[prevRoom]}</Button> : <span />}
        <span className="text-muted-foreground">{ROOM_NAMES[room]}</span>
        {nextRoom && (nextOpen
          ? <Button variant="outline" size="sm" onClick={() => go(nextRoom)}>{ROOM_NAMES[nextRoom]} →</Button>
          : <span className="text-muted-foreground">Дальше тропинка заросла: ещё {ROOM_UNLOCK - (steps[room] ?? 0)}</span>)}
      </div>
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