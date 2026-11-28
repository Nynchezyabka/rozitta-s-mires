import { DueBadge, LocationPath } from "@/components/BoxBits";
import { createFileRoute, useNavigate, useBlocker } from "@tanstack/react-router";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BoxClothes } from "@/components/ClothStorage";
import { MissingBox } from "@/components/MissingBox";
import { PhotoStrip } from "@/components/PhotoStrip";
import { CreateGroup } from "@/components/CreateGroup";
import { AppShell } from "@/components/AppShell";
import { ItemsEditor, GroupPicker, isLater, isKids, KidsPicker, LocationInput, type EditItem } from "@/components/BoxParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type HouseholdData } from "@/lib/household";
import { deleteBox, restoreBox, saveBox, moveBox, getHousehold } from "@/lib/store";
import { BoxConflictError } from "@/lib/box-conflict";
import { useOffline } from "@/lib/use-offline";

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
  return <AppShell>{(d, t) => <BoxEdit key={`${t}-${id}`} d={d} token={t} id={id} />}</AppShell>;
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
  const [base, setBase] = useState("");
  const [revision, setRevision] = useState<number | undefined>(undefined);
  const [conflict, setConflict] = useState(false);
  const [reloadOpen, setReloadOpen] = useState(false);
  const { offline } = useOffline(token);
  const snap = JSON.stringify([items, groupId, note, decideBy, kidSize, kidSeason, place, shots]);
  const dirty = !!box && !busy && base !== "" && base !== "pending" && snap !== base;
  const blocker = useBlocker({ shouldBlockFn: () => dirty, enableBeforeUnload: () => dirty, withResolver: true });
  useEffect(() => { if (base === "pending") setBase(snap); }, [snap, base]); // eslint-disable-line react-hooks/exhaustive-deps
  const loadDraft = (source: HouseholdData) => {
    const stored = source.boxes.find((b) => b.id === id);
    if (!stored) return;
    setItems(source.items.filter((i) => i.box_id === id).map((i) => ({ name: i.name, kind: i.kind === "book" ? "book" : "item", author: i.author, needs_review: i.needs_review, category: i.category })));
    setGroupId(stored.group_id);
    setNote(stored.note ?? "");
    setDecideBy(stored.decide_by ?? "");
    setKidSize(stored.kid_size ?? "");
    setKidSeason(stored.kid_season ?? "");
    setPlace(stored.location ?? "");
    setShots(stored.photo_paths);
    setRevision(stored.revision);
    setConflict(false);
    setBase("pending");
  };
  useEffect(() => {
    if (!box) return;
    loadDraft(d);
  }, [box?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!box) return <MissingBox id={id} token={token} />;
  const group = d.groups.find((g) => g.id === groupId);

  const save = async () => {
    setBusy(true);
    try {
      const saved = await saveBox({ data: { token, id, revision, group_id: groupId, note, decide_by: decideBy || null, kid_size: isKids(group) ? kidSize : null, kid_season: isKids(group) ? kidSeason : null, location: place, photos: shots, items } });
      setRevision(saved.revision);
      setConflict(false);
      await qc.invalidateQueries({ queryKey: ["household", token] });
      setBase(snap);
      toast.success("Сохранено");
    } catch (e) {
      if (e instanceof BoxConflictError) setConflict(true);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** Saves only the new place, from the stored chest — unsaved edits on the page stay untouched. */
  const move = async () => {
    setBusy(true);
    try {
      const saved = await moveBox({ data: { token, id, revision, location: moveTo.trim() } });
      setRevision(saved.revision);
      if (base && base !== "pending") {
        const previous = JSON.parse(base) as unknown[];
        previous[6] = moveTo.trim();
        setBase(JSON.stringify(previous));
      }
      await qc.invalidateQueries({ queryKey: ["household", token] });
      setPlace(moveTo.trim());
      setMoveOpen(false);
      toast.success("Сундук переставлен");
    } catch (e) {
      if (e instanceof BoxConflictError) setConflict(true);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 pt-2" data-unsaved={dirty ? "true" : undefined}>
      {conflict && <section role="alert" className="space-y-3 border-l-4 border-warning bg-card p-3">
        <p className="font-semibold">Этот сундук уже изменили</p>
        <p className="text-sm">Ваши правки остались здесь. Скопируйте их перед загрузкой свежей записи.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={async () => {
            try { await navigator.clipboard.writeText(JSON.stringify({ items, note, location: place, group_id: groupId, decide_by: decideBy, kid_size: kidSize, kid_season: kidSeason }, null, 2)); toast.success("Ваши правки скопированы"); }
            catch { toast.error("Не удалось скопировать правки"); }
          }}>Скопировать мои правки</Button>
          <Button variant="secondary" disabled={offline || busy} onClick={() => setReloadOpen(true)}>Загрузить свежую запись</Button>
        </div>
      </section>}
      <AlertDialog open={reloadOpen} onOpenChange={setReloadOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Загрузить свежую запись?</AlertDialogTitle><AlertDialogDescription>Несохранённые правки на этом экране заменятся последней записью дома. Сначала скопируйте их, если хотите сохранить.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Остаться</AlertDialogCancel><AlertDialogAction onClick={async () => {
            try { const fresh = await getHousehold({ data: { token } }); qc.setQueryData(["household", token], fresh); loadDraft(fresh); }
            catch (e) { toast.error((e as Error).message); }
          }}>Загрузить</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
        <Button variant="outline" className="h-11" disabled={offline} onClick={() => { setMoveTo(box.location ?? ""); setMoveOpen(true); }}>{box.location ? "Переставить" : "Указать"}</Button>
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
      <BoxClothes token={token} boxId={id} boxes={d.boxes} />
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
      <div className="sticky bottom-20 z-20 lg:bottom-4">
        <Button className={`h-14 w-full rounded-2xl text-base shadow-lg ${dirty ? "" : "opacity-90"}`} disabled={busy || offline || conflict} onClick={save}>
          {busy ? "Сохраняю…" : dirty ? "Сохранить изменения" : "Сохранить"}
        </Button>
      </div>
      <AlertDialog open={blocker.status === "blocked"}>
        <AlertDialogContent className="border-2 border-primary/60 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Уйти без сохранения?</AlertDialogTitle>
            <AlertDialogDescription>Изменения в сундуке ещё не записаны и пропадут.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>Остаться</AlertDialogCancel>
            <AlertDialogAction onClick={() => blocker.proceed?.()}>Уйти</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
