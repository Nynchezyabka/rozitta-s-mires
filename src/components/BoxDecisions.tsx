import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { decideBox, type HouseholdData } from "@/lib/store";
import { extendDecision, localDate } from "@/lib/box-actions";

export function BoxDecisions({ d, token }: { d: HouseholdData; token: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const boxes = d.boxes.filter((b) => b.decide_by && b.decide_by <= localDate());
  if (!boxes.length) return null;
  const act = async (id: string, date: string | null) => {
    setBusy(true);
    try {
      await decideBox({ data: { token, id, date } });
      await qc.invalidateQueries({ queryKey: ["household", token] });
      toast.success(date ? "Срок продлён на 3 месяца" : "Отметка снята — содержимое сохранено");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  return <section className="space-y-2 bg-warning/20 p-3">
    <h2 className="flex items-center gap-2 text-sm font-semibold"><AlertCircle className="h-5 w-5" />Пора решить</h2>
    {boxes.map((b) => <div key={b.id} className="flex flex-wrap items-center gap-2 border-t border-warning/30 pt-2">
      <Link to="/box/$id" params={{ id: b.id }} className="min-w-0 flex-1 text-sm font-semibold underline">Сундук №{b.number}{b.location && <span className="block break-words text-xs font-normal">{b.location}</span>}</Link>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => act(b.id, extendDecision())}>Продлить на 3 месяца</Button>
      <Button variant="secondary" size="sm" disabled={busy} onClick={() => act(b.id, null)}>Разобрано</Button>
    </div>)}
  </section>;
}