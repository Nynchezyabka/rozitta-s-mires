import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRightLeft, DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getClothes, saveCloth, type Cloth, type HouseholdData } from "@/lib/store";
import { clothDestination, LAYERS } from "@/lib/wardrobe";

export function ClothStorage({ cloth, token, boxes }: { cloth: Cloth; token: string; boxes: HouseholdData["boxes"] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState(cloth.box_id ?? "");
  const [busy, setBusy] = useState(false);
  async function move(boxId: string | null) {
    setBusy(true);
    try {
      await saveCloth({ data: { ...cloth, token, ...clothDestination(cloth.status, boxId), photo: null } });
      await qc.invalidateQueries({ queryKey: ["clothes", token] });
      setOpen(false);
      toast.success(boxId ? "Вещь переложена в сундук" : "Вещь в шкафу");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Не сохранилось"); }
    finally { setBusy(false); }
  }
  return <>
    <div className="flex flex-wrap gap-1">
      {cloth.box_id && <Button size="sm" variant="secondary" disabled={busy} onClick={() => void move(null)}><DoorOpen />Достать в шкаф</Button>}
      <Button size="sm" variant="outline" disabled={busy} onClick={() => { setDestination(cloth.box_id ?? ""); setOpen(true); }}><ArrowRightLeft />{cloth.box_id ? "Переложить" : "Убрать в сундук"}</Button>
    </div>
    <Dialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Куда переместить «{cloth.name}»?</DialogTitle></DialogHeader>
        <select aria-label="Куда переместить вещь" value={destination} onChange={(e) => setDestination(e.target.value)} className="h-11 w-full rounded-md border-2 border-border bg-card px-2 text-sm">
          <option value="">В шкаф</option>
          {boxes.map((b) => <option key={b.id} value={b.id}>№{b.number} — {b.note || b.location || "Сундук"}</option>)}
        </select>
        <Button disabled={busy || destination === (cloth.box_id ?? "")} onClick={() => void move(destination || null)}>{busy ? "Перемещаю…" : "Переместить"}</Button>
      </DialogContent>
    </Dialog>
  </>;
}

export function BoxClothes({ token, boxId, boxes }: { token: string; boxId: string; boxes: HouseholdData["boxes"] }) {
  const q = useQuery({ queryKey: ["clothes", token], queryFn: () => getClothes({ data: { token } }) });
  const list = (q.data ?? []).filter((c) => c.box_id === boxId);
  return <section className="space-y-2">
    <h2 className="font-semibold">👗 Одежда в этом сундуке{q.data ? ` · ${list.length}` : ""}</h2>
    {q.isPending ? <p className="text-sm text-muted-foreground">Открываю гардероб…</p> : q.isError ? <p className="text-sm text-destructive">Не удалось проверить гардероб. <Button variant="link" onClick={() => void q.refetch()}>Повторить</Button></p> : list.length ? <div className="grid gap-2 sm:grid-cols-2">
      {list.map((c) => <article key={c.id} className="rounded-lg border-2 border-border bg-card p-2">
        <Button asChild variant="ghost" className="mb-2 h-auto w-full justify-start whitespace-normal p-0 text-left">
          <Link to="/wardrobe" search={{ item: c.id }}>{c.photo_url ? <img src={c.photo_url} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" /> : <span className="grid h-16 w-16 shrink-0 place-items-center bg-muted text-3xl">{LAYERS.find((l) => l.id === c.layer)?.icon}</span>}
            <span className="min-w-0"><span className="block">{c.name}</span><span className="text-xs text-muted-foreground">{[c.owner, c.size].filter(Boolean).join(" · ")}</span></span>
          </Link>
        </Button>
        <ClothStorage cloth={c} token={token} boxes={boxes} />
      </article>)}
    </div> : <p className="text-sm text-muted-foreground">Одежда из гардероба сюда пока не положена.</p>}
  </section>;
}