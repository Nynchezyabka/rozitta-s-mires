import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HEALTH_FLAGS, getHealth, setHealth, type Health } from "@/lib/health";

export function HealthProfile() {
  const [h, setH] = useState<Health>({ flags: [], notes: "" });
  useEffect(() => setH(getHealth()), []);
  const toggle = (id: Health["flags"][number]) =>
    setH((x) => ({ ...x, flags: x.flags.includes(id) ? x.flags.filter((f) => f !== id) : [...x.flags, id] }));
  return (
    <section id="health" className="space-y-3 rounded-2xl border-2 border-accent/40 bg-card p-4">
      <h2 className="font-display text-lg font-bold">💊 Профиль здоровья для аптечки</h2>
      <p className="text-sm text-muted-foreground">Розитта сверит с этим каждое лекарство и поставит 🟢 🟡 🔴. Хранится в этом браузере, но при распознавании аптечки отправляется выбранному ИИ-сервису вместе с фото, а при «Вставить список» входит в подсказку, которую вы сами копируете в чат. Это подсказка, а не совет врача.</p>
      <div className="flex flex-wrap gap-2">
        {HEALTH_FLAGS.map((f) => (
          <button key={f.id} type="button" onClick={() => toggle(f.id)} className={`rounded-full px-3 py-1.5 text-sm ${h.flags.includes(f.id) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            {f.label}
          </button>
        ))}
      </div>
      <Textarea value={h.notes} onChange={(e) => setH({ ...h, notes: e.target.value })} rows={3} placeholder="Свои противопоказания: аллергия на пенициллин, гастрит, давление…" />
      <Button onClick={() => { setHealth(h); toast.success("Записано: Розитта будет сверять аптечку с этим"); }}>Сохранить</Button>
    </section>
  );
}
