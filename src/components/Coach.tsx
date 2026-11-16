import { useState } from "react";
import { Check, Shuffle, Sprout, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COACH_MODES, nextTask, type CoachMode } from "@/lib/coach";
import { sfx } from "@/lib/rozitta";

/** Any step towards order counts: log your own, or ask Rozitta for a hint. */
export function Coach({ onDone }: { onDone: (what: string) => void }) {
  const [what, setWhat] = useState("");
  const [mode, setMode] = useState<CoachMode | null>(null);
  const [task, setTask] = useState("");

  const choose = (m: CoachMode) => { setMode(m); setTask(nextTask(m)); sfx.bubble(); };
  const logOwn = () => { onDone(what.trim()); setWhat(""); };
  const doneTask = () => { onDone(task); setMode(null); };

  return (
    <section aria-label="Шаг к порядку" className="space-y-5 py-4">
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); logOwn(); }}>
        <h2 className="text-sm font-semibold">Сделала что-то для порядка?</h2>
        <p className="text-xs text-muted-foreground">Любое дело считается — от выкинутого чека до разобранного комода.</p>
        <Input value={what} onChange={(e) => setWhat(e.target.value)} placeholder="Что сделано? (можно не писать)" maxLength={80} aria-label="Что сделано" />
        <Button type="submit" className="w-full"><Sprout />Засчитать шаг</Button>
      </form>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Не знаешь, с чего начать?</h2>
        {!mode ? (
          <div className="grid grid-cols-1 gap-2 min-[440px]:grid-cols-3">
            {COACH_MODES.map((m) => (
              <Button key={m.id} variant="secondary" onClick={() => choose(m.id)} className="h-auto min-h-14 flex-row justify-start whitespace-normal px-3 py-2 min-[440px]:flex-col min-[440px]:justify-center">
                <span aria-hidden className="text-xl">{m.icon}</span>
                <span className="flex flex-col gap-0.5 text-left min-[440px]:text-center">
                  <span className="text-sm font-medium leading-snug">{m.label}</span>
                  <span className="text-[11px] leading-snug text-muted-foreground">{m.hint}</span>
                </span>
              </Button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="min-h-12 text-base leading-relaxed" aria-live="polite">🐸 {task}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={doneTask}><Check />Сделано</Button>
              <Button variant="secondary" onClick={() => setTask(nextTask(mode, task))}><Shuffle />Другое</Button>
              <Button variant="ghost" onClick={() => setMode(null)}><X />Не сейчас</Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
