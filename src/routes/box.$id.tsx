import { DueBadge, LocationPath } from "@/components/BoxBits";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhotoStrip } from "@/components/PhotoStrip";
import { CreateGroup } from "@/components/CreateGroup";
import { AppShell } from "@/components/AppShell";
import { ItemsEditor, GroupPicker, isLater, isKids, KidsPicker, LocationInput, type EditItem } from "@/components/BoxParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type HouseholdData } from "@/lib/household";
import { deleteBox, restoreBox, saveBox } from "@/lib/store";

export const Route = createFileRoute("/box/$id")({
  head: () => ({
    meta: [
      { title: "Сундук · Топи Розитты" },
      { name: "description", content: "Содержимое сундука, группа и заметки." },
      { property: "og:title", content: "Сундук · Топи Розитты" },
      { property: "og:description", content: "Содержимое сундука, группа и заметки." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BoxPage,
});

function BoxPage() {
  const { id } = Route.useParams();
  return <AppShell>{(d, t) => <BoxEdit key={id} d={d} token={t} id={id} />}</AppShell>;
}

function BoxEdit({ d, token, id }: { d: HouseholdData; token: string; id: string }) {
  const box = d.boxes.find((b) => b.id === id);
  const nav = useNavigate();
  const qc = useQueryClient();
  const [items, setItems] = useState<EditItem[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [decideBy, setDecideBy] = useState("");
  const [kidSize, setKidSize] = useState("");
  const [kidSeason, setKidSeason] = useState("");
  const [place, setPlace] = useState("");
  const [shots, setShots] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTo, setMoveTo] = useState("");
  useEffect(() => {
    if (!box) return;
    setItems(d.items.filter((i) => i.box_id === id).map((i) => ({ name: i.name, kind: i.kind === "book" ? "book" : "item", author: i.author, needs_review: i.needs_review, category: i.category ?? null })));
    setGroupId(box.group_id);
    setNote(box.note ?? "");
    setDecideBy(box.decide_by ?? "");
    setKidSize(box.kid_size ?? "");
    setKidSeason(box.kid_season ?? "");
    setPlace(box.location ?? "");
    setShots(box.photo_paths);
  }, [box?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!box) return <p className="py-10 text-center text-muted-foreground">Сундук не найден. Возможно, он из другого дома или удалён — отсканируйте наклейку кнопкой сканера в шапке.</p>;
  const group = d.groups.find((g) => g.id === groupId);

  const save = async () => {
    setBusy(true);
    try {
      await saveBox({ data: { token, id, group_id: groupId, note, decide_by: decideBy || null, kid_size: isKids(group) ? kidSize : null, kid_season: isKids(group) ? kidSeason : null, location: place, photos: shots, items } });
      await qc.invalidateQueries({ queryKey: ["household", token] });
      toast.success("Сохранено");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** Saves only the new place, from the stored chest — unsaved edits on the page stay untouched. */
  const move = async () => {
    setBusy(true);
    try {
      const stored = d.items.filter((i) => i.box_id === id).map((i) => ({ name: i.name, kind: i.kind === "book" ? ("book" as const) : ("item" as const), author: i.author, needs_review: i.needs_review, category: i.category ?? null }));
      await saveBox({ data: { token, id, group_id: box.group_id, note: box.note ?? "", decide_by: box.decide_by, kid_size: box.kid_size, kid_season: box.kid_season, location: moveTo.trim(), photos: box.photo_paths, items: stored } });
      await qc.invalidateQueries({ queryKey: ["household", token] });
      setPlace(moveTo.trim());
      setMoveOpen(false);
      toast.success("Сундук переставлен");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl font-display text-2xl font-bold" style={{ backgroundColor: group?.color ?? "transparent" }}>
          {box.number}
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Сундук №{box.number}</h1>
          <p className="text-sm text-muted-foreground">{items.length} вещей</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-card p-3">
        <MapPin className="shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Где стоит</p>
          <p className="truncate font-medium">{box.location || "Место не указано"}</p>
        </div>
        <Button variant="outline" className="h-11" onClick={() => { setMoveTo(box.location ?? ""); setMoveOpen(true); }}>{box.location ? "Переставить" : "Указать"}</Button>
      </div>
      <Dialog open={moveOpen} onOpenChange={(o) => { if (!busy) setMoveOpen(o); }}>
        <DialogContent className="w-[calc(100%-2rem)] rounded-lg bg-background">
          <DialogHeader>
            <DialogTitle>Куда переставить?</DialogTitle>
            <DialogDescription>Сохранится только новое место.</DialogDescription>
          </DialogHeader>
          <LocationInput value={moveTo} onChange={setMoveTo} known={d.boxes.map((b) => b.location)} />
          <Button className="h-12 w-full" disabled={busy} onClick={move}>{busy ? "Сохраняю…" : "Сохранить место"}</Button>
        </DialogContent>
      </Dialog>
      {shots[0] && <img src={shots[0].startsWith("data:") ? shots[0] : box.photo_urls[box.photo_paths.indexOf(shots[0])]} alt="" className="max-h-72 w-full rounded-2xl object-cover" />}
      <PhotoStrip value={shots} onChange={setShots} urlOf={(p) => box.photo_urls[box.photo_paths.indexOf(p)]} />
      <section className="space-y-2">
        <h2 className="font-semibold">Что внутри</h2>
        <ItemsEditor items={items} onChange={setItems} />
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Группа</h2>
        <GroupPicker groups={d.groups} value={groupId} onChange={setGroupId} />
        <CreateGroup groups={d.groups} token={token} onCreated={setGroupId} />
          {isKids(group) && <KidsPicker size={kidSize} season={kidSeason} onSize={setKidSize} onSeason={setKidSeason} />}
        <h2 className="pt-2 font-semibold">Где стоит</h2>
        <LocationInput value={place} onChange={setPlace} known={d.boxes.map((b) => b.location)} />
        <label className="block space-y-1">
          <span className="text-sm font-medium">{isLater(group) ? "Решить до" : "Срок годности / пересмотреть до"}</span>
          <Input type="date" value={decideBy} onChange={(e) => setDecideBy(e.target.value)} className="h-12" />
        </label>
        <DueBadge date={decideBy} />
        <LocationPath value={place} />
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Заметка</h2>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: стоит в кладовке" />
      </section>
      <Button className="h-14 w-full rounded-2xl text-base" disabled={busy} onClick={save}>
        {busy ? "Сохраняю…" : "Сохранить"}
      </Button>
      <button
        className="flex w-full items-center justify-center gap-2 py-2 text-sm text-destructive"
        onClick={async () => {
          await deleteBox({ data: { token, id } });
          await qc.invalidateQueries({ queryKey: ["household", token] });
          nav({ to: "/" });
          toast(`Сундук №${box.number} удалён`, {
            duration: 7000,
            action: {
              label: "Вернуть",
              onClick: async () => {
                await restoreBox({ data: { token, id } });
                await qc.invalidateQueries({ queryKey: ["household", token] });
                toast.success("Возвращено");
              },
            },
          });
        }}
      >
        <Trash2 className="h-4 w-4" /> Удалить сундук
      </button>
    </div>
  );
}
