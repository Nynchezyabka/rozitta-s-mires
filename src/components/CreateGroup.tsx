import { useState, type CSSProperties } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { IconPicker } from "@/components/IconPicker";
import { GROUP_COLORS } from "@/lib/defaults";
import { suggestIcons } from "@/lib/icons";
import { getHousehold, saveGroup, type HouseholdData } from "@/lib/store";

/** Adds a group without navigating away or clearing the chest draft. */
export function CreateGroup({ groups, token, onCreated }: { groups: HouseholdData["groups"]; token: string; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(GROUP_COLORS[0] ?? "");
  const [icon, setIcon] = useState("📦");
  const [manualIcon, setManualIcon] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const known = new Set(groups.map((g) => g.id));
      await saveGroup({ data: { token, name: name.trim(), color, icon, position: groups.length } });
      const updated = await getHousehold({ data: { token } });
      qc.setQueryData(["household", token], updated);
      const added = updated.groups.find((g) => !known.has(g.id) && g.name === name.trim());
      if (added) onCreated(added.id);
      setOpen(false);
      setName(""); setIcon("📦"); setManualIcon(false);
      toast.success("Группа добавлена");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не получилось добавить группу");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11 w-full"><Plus /> Добавить группу</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85svh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg bg-background">
        <DialogHeader>
          <DialogTitle>Новая группа</DialogTitle>
          <DialogDescription>Сундук и его содержимое останутся на месте.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Название группы</span>
            <Input autoFocus maxLength={60} value={name} onChange={(e) => { setName(e.target.value); if (!manualIcon) setIcon(suggestIcons(e.target.value)[0] ?? "📦"); }} placeholder="Например, «Дача»" className="h-12 text-base" />
          </label>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Цвет</legend>
            <div className="flex flex-wrap gap-2">
              {GROUP_COLORS.map((c, i) => <Button key={c} type="button" variant="ghost" size="icon" className={`group-swatch h-10 w-10 rounded-full ${color === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`} style={{ "--group-swatch": c } as CSSProperties} aria-label={`Цвет ${i + 1}`} aria-pressed={color === c} onClick={() => setColor(c)} />)}
            </div>
          </fieldset>
          <details className="space-y-2 border-y border-border py-3">
            <summary className="cursor-pointer text-sm font-medium"><span className="mr-2 text-xl">{icon}</span> Изменить значок</summary>
            <IconPicker name={name} value={icon} onChange={(value) => { setIcon(value); setManualIcon(true); }} />
          </details>
          <Button type="submit" className="h-12 w-full" disabled={!name.trim() || busy}>{busy ? "Добавляю…" : "Добавить и выбрать"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}