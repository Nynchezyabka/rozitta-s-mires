import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { COACH_MODES, addBloom, bloomAt, getGarden, nextTask, type BloomId, type CoachMode } from "@/lib/coach";
import { sfx } from "@/lib/rozitta";
import lily from "@/assets/bloom-lily.png";
import lily2 from "@/assets/bloom-lily2.png";
import kiwi from "@/assets/bloom-kiwi.png";
import romanesco from "@/assets/bloom-romanesco.png";
import eryngium from "@/assets/bloom-eryngium.png";
import veggie from "@/assets/bloom-veggie.png";
import chrysanthemum from "@/assets/bloom-chrysanthemum.png";
import peony from "@/assets/bloom-peony.png";

const PICS: Record<BloomId, string> = { lily, lily2, kiwi, romanesco, eryngium, veggie, chrysanthemum, peony };
const SHOWN = 24;

export function Coach() {
  const [mode, setMode] = useState<CoachMode | null>(null);
  const [task, setTask] = useState("");
  const [garden, setGarden] = useState(0);
  const [fresh, setFresh] = useState(-1);
  useEffect(() => setGarden(getGarden()), []);

  const choose = (m: CoachMode) => { setMode(m); setTask(nextTask(m)); sfx.bubble(); };
  const done = () => {
    const n = addBloom();
    setGarden(n);
    setFresh(n - 1);
    sfx.key();
    toast.success(`Распустилось: ${bloomAt(n - 1).name}!`);
    setMode(null);
  };
  const start = Math.max(0, garden - SHOWN);

  return (
    <section className="space-y-3 rounded-3xl border-2 border-primary/40 bg-card/90 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-sm text-primary">Заводь Розитты</h2>
        <span className="text-xs text-muted-foreground">{garden ? `цветов: ${garden}` : "пока тихо"}</span>
      </div>
      <div className="flex min-h-16 flex-wrap items-end gap-1 rounded-2xl bg-muted/50 p-2">
        {garden === 0 && <p className="p-2 text-sm text-muted-foreground">Сделай одно маленькое дело — и здесь распустится первая кувшинка.</p>}
        {Array.from({ length: garden - start }, (_, i) => {
          const n = start + i;
          const b = bloomAt(n);
          return <img key={n} src={PICS[b.id]} alt={b.name} title={b.name} width={48} height={48} loading="lazy" className={`pixel h-12 w-12 ${n === fresh ? "animate-in zoom-in-50 duration-700" : ""}`} />;
        })}
      </div>

      {!mode ? (
        <>
          <p className="text-sm">Нет сил на большое? Выбери, как сегодня:</p>
          <div className="grid grid-cols-3 gap-2">
            {COACH_MODES.map((m) => (
              <button key={m.id} type="button" onClick={() => choose(m.id)} className="flex flex-col items-center gap-1 rounded-2xl bg-secondary p-3 text-center">
                <span className="text-2xl">{m.icon}</span>
                <span className="text-sm font-medium leading-tight">{m.label}</span>
                <span className="text-[11px] leading-tight text-muted-foreground">{m.hint}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <p className="rounded-2xl bg-secondary p-4 text-base">🐸 {task}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={done}>Сделано ✓</Button>
            <Button variant="secondary" onClick={() => setTask(nextTask(mode, task))}>Другое</Button>
            <Button variant="ghost" onClick={() => setMode(null)}>Не сегодня</Button>
          </div>
        </div>
      )}
    </section>
  );
}
