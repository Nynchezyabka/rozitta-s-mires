import { useEffect, useState } from "react";
import { DoorClosed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Coach } from "@/components/Coach";
import { GardenScene } from "@/components/GardenScene";
import { addBloom, getGarden } from "@/lib/coach";
import { gardenRewardAt, type GardenId } from "@/lib/garden";
import { sfx } from "@/lib/rozitta";
import door from "@/assets/garden-door.jpg";
import key from "@/assets/garden-key.png";

export function SecretGarden() {
  const [open, setOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [fresh, setFresh] = useState<GardenId | null>(null);
  const [earned, setEarned] = useState("");
  useEffect(() => {
    const refresh = () => setTotal(getGarden());
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  const done = () => {
    const count = addBloom();
    const plant = gardenRewardAt(count - 1);
    setTotal(count);
    setFresh(plant.id);
    setEarned(plant.name);
    sfx.key();
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
        <p className="text-xs text-foreground/90">{total ? `Маленьких дел: ${total}` : "Только если хочется."}</p>
      </div>
    </section>
  );

  return (
    <section className="garden-open pt-4">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-sm leading-relaxed text-primary">Таинственный сад</h1>
          <p className="mt-2 text-xs text-muted-foreground">Маленьких дел: <span data-testid="garden-total">{total}</span></p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Закрыть дверь сада" title="Закрыть дверь сада" onClick={() => setOpen(false)}><DoorClosed /></Button>
      </header>
      <div className="-mx-4"><GardenScene total={total} fresh={fresh} /></div>
      {earned && <p className="mt-3 text-sm text-primary" role="status">Выросло: {earned}</p>}
      <Coach onDone={done} />
    </section>
  );
}