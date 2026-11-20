import { useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, Plus, Check, Pencil } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { householdQuery, setToken, useHouses } from "@/lib/household";
import { createHousehold, renameHousehold } from "@/lib/store";

/** Switch between houses (дом, дача…) and add a new one. */
export function HouseSwitcher({ token, name }: { token: string; name: string }) {
  const houses = useHouses();
  const qs = useQueries({ queries: houses.map((t) => ({ ...householdQuery(t), staleTime: 60_000 })) });
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("Дача");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const [ren, setRen] = useState(false);
  const [newTitle, setNewTitle] = useState(name);
  const rename = async () => {
    const n = newTitle.trim();
    if (!n) return;
    setBusy(true);
    try {
      await renameHousehold({ data: { token, name: n } });
      await qc.invalidateQueries({ queryKey: ["household", token] });
      setRen(false);
      toast.success("Дом переименован");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const add = async () => {
    setBusy(true);
    try {
      const r = await createHousehold({ data: { name: newName } });
      setToken(r.token);
      setOpen(false);
      toast.success(`🐸 Дом «${newName}» заведён`);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex min-w-0 items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-sm text-secondary-foreground" aria-label="Выбрать дом">
          <span className="truncate">🏠 {name}</span><ChevronDown className="h-4 w-4 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="z-50 w-60 border-2 border-primary/60 bg-card">
          <p className="px-2 pb-1 pt-2 text-[10px] uppercase tracking-wide text-muted-foreground">Мои дома</p>
          {houses.map((t, i) => (
            <DropdownMenuItem key={t} onClick={() => setToken(t)}>
              {t === token ? <Check className="mr-2 h-4 w-4" /> : <span className="mr-2 w-4" />}
              {qs[i]?.data?.household.name ?? "…"}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { setNewTitle(name); setRen(true); }}><Pencil className="mr-2 h-4 w-4" />Переименовать этот дом</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Добавить дом</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новый дом</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Например, дача или квартира родителей. У него будут свои сундуки.</p>
          <Input aria-label="Название дома" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-12" />
          <Button className="h-12" disabled={busy} onClick={add}>{busy ? "Завожу…" : "Завести"}</Button>
        </DialogContent>
      </Dialog>
      <Dialog open={ren} onOpenChange={setRen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Название дома</DialogTitle></DialogHeader>
          <Input aria-label="Новое название дома" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && rename()} className="h-12" />
          <Button className="h-12" disabled={busy || !newTitle.trim()} onClick={rename}>{busy ? "Сохраняю…" : "Сохранить"}</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
