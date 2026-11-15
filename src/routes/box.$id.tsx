import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ItemsEditor, GroupPicker, isLater, isKids, KidsPicker, LocationInput, type EditItem } from "@/components/BoxParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { compressImage, type HouseholdData } from "@/lib/household";
import { deleteBox, restoreBox, saveBox } from "@/lib/store";

export const Route = createFileRoute("/box/$id")({
  head: () => ({
    meta: [
      { title: "Коробка — Тайные Хроники Топей Розитты" },
      { name: "description", content: "Содержимое коробки, группа и заметки." },
      { property: "og:title", content: "Коробка — Тайные Хроники Топей Розитты" },
      { property: "og:description", content: "Содержимое коробки, группа и заметки." },
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<EditItem[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [decideBy, setDecideBy] = useState("");
  const [kidSize, setKidSize] = useState("");
  const [kidSeason, setKidSeason] = useState("");
  const [place, setPlace] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!box) return;
    setItems(d.items.filter((i) => i.box_id === id).map((i) => ({ name: i.name, kind: i.kind === "book" ? "book" : "item", author: i.author, needs_review: i.needs_review })));
    setGroupId(box.group_id);
    setNote(box.note ?? "");
    setDecideBy(box.decide_by ?? "");
    setKidSize(box.kid_size ?? "");
    setKidSeason(box.kid_season ?? "");
    setPlace(box.location ?? "");
  }, [box?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!box) return <p className="py-10 text-center text-muted-foreground">Коробка не найдена</p>;
  const group = d.groups.find((g) => g.id === groupId);

  const save = async () => {
    setBusy(true);
    try {
      await saveBox({ data: { token, id, group_id: groupId, note, decide_by: decideBy || null, kid_size: isKids(group) ? kidSize : null, kid_season: isKids(group) ? kidSeason : null, location: place, photo, items } });
      await qc.invalidateQueries({ queryKey: ["household", token] });
      setPhoto(null);
      toast.success("Сохранено");
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
          <h1 className="font-display text-2xl font-bold">Коробка №{box.number}</h1>
          <p className="text-sm text-muted-foreground">{items.length} вещей</p>
        </div>
      </div>
      <div className="relative">
        {photo || box.photo_url ? <img src={photo ?? box.photo_url!} alt="" className="w-full rounded-2xl object-cover" /> : <div className="h-32 rounded-2xl bg-muted" />}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => e.target.files?.[0] && setPhoto(await compressImage(e.target.files[0]))} />
        <Button size="sm" variant="secondary" className="absolute bottom-3 right-3" onClick={() => fileRef.current?.click()}>
          <Camera className="h-4 w-4" /> {box.photo_url ? "Переснять" : "Фото"}
        </Button>
      </div>
      <section className="space-y-2">
        <h2 className="font-semibold">Что внутри</h2>
        <ItemsEditor items={items} onChange={setItems} />
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Группа</h2>
        <GroupPicker groups={d.groups} value={groupId} onChange={setGroupId} />
          {isKids(group) && <KidsPicker size={kidSize} season={kidSeason} onSize={setKidSize} onSeason={setKidSeason} />}
        <h2 className="pt-2 font-semibold">Где стоит</h2>
        <LocationInput value={place} onChange={setPlace} known={d.boxes.map((b) => b.location)} />
        {isLater(group) && <Input type="date" value={decideBy} onChange={(e) => setDecideBy(e.target.value)} className="h-12" aria-label="Решить до" />}
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
          toast(`Коробка №${box.number} удалена`, {
            duration: 7000,
            action: {
              label: "Вернуть",
              onClick: async () => {
                await restoreBox({ data: { token, id } });
                await qc.invalidateQueries({ queryKey: ["household", token] });
                toast.success("Вернула");
              },
            },
          });
        }}
      >
        <Trash2 className="h-4 w-4" /> Удалить коробку
      </button>
    </div>
  );
}
