import { useState } from "react";
import { Check, Shuffle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COACH_MODES, nextTask, type CoachMode } from "@/lib/coach";
import { sfx } from "@/lib/rozitta";

export function Coach({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<CoachMode | null>(null);
  const [task, setTask] = useState("");

  const choose = (m: CoachMode) => { setMode(m); setTask(nextTask(m)); sfx.bubble(); };
  const done = () => {
    onDone();
    setMode(null);
  };

  return (
    <section aria-label="Маленькое дело с Розиттой" className="space-y-3 py-4">
      {!mode ? (
        <>
          <h2 className="text-sm font-semibold">Как сегодня?</h2>
          <div className="grid grid-cols-1 gap-2 min-[440px]:grid-cols-3">
            {COACH_MODES.map((m) => (
              <Button key={m.id} variant="secondary" onClick={() => choose(m.id)} className="h-auto min-h-16 flex-row whitespace-normal px-3 py-3 min-[440px]:flex-col">
                <span aria-hidden className="text-xl">{m.icon}</span>
                <span className="flex flex-col gap-1 text-left min-[440px]:text-center">
                  <span className="text-sm font-medium leading-snug">{m.label}</span>
                  <span className="text-[11px] leading-snug text-muted-foreground">{m.hint}</span>
                </span>
              </Button>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <p className="min-h-14 text-base leading-relaxed" aria-live="polite">🐸 {task}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={done}><Check />Сделано</Button>
            <Button variant="secondary" onClick={() => setTask(nextTask(mode, task))}><Shuffle />Другое</Button>
            <Button variant="ghost" onClick={() => setMode(null)}><X />Не сегодня</Button>
          </div>
        </div>
      )}
    </section>
  );
}
