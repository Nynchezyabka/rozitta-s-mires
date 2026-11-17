import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, ImageDown, Printer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { FORMATS, MAX_CUSTOM_MM, boxQrUrl, drawSticker, isPreviewHost, printStickers, stickersPdf, stickersPng, type Format, type Sticker, type StickerContent, type StickerStyle } from "@/lib/stickers";
import type { HouseholdData } from "@/lib/household";

export const Route = createFileRoute("/stickers")({
  head: () => ({
    meta: [
      { title: "Наклейки · Топи Розитты" },
      { name: "description", content: "Наклейки с номером, цветом и группой сундука в PDF." },
      { property: "og:title", content: "Наклейки · Топи Розитты" },
      { property: "og:description", content: "Наклейки с номером, цветом и группой сундука в PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AppShell>{(d) => <Stickers d={d} />}</AppShell>,
});

function Stickers({ d }: { d: HouseholdData }) {
  const [sel, setSel] = useState<Set<string>>(() => new Set(d.boxes.map((b) => b.id)));
  const [qr, setQr] = useState(true);
  const [style, setStyle] = useState<StickerStyle>("brand");
  const [busy, setBusy] = useState(false);
  const [fid, setFid] = useState<Format["id"]>("a4");
  const [cw, setCw] = useState("60");
  const [ch, setCh] = useState("40");
  const [preview, setPreview] = useState("");
  const [content, setContent] = useState<StickerContent>("number");
  const [host, setHost] = useState("");
  useEffect(() => setHost(location.hostname), []);
  const gmap = Object.fromEntries(d.groups.map((g) => [g.id, g]));
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const base = FORMATS.find((f) => f.id === fid)!;
  const tooBig = fid === "custom" && (Number(cw) > MAX_CUSTOM_MM || Number(ch) > MAX_CUSTOM_MM);
  const fmt: Format = fid === "custom" ? { id: "custom", w: Math.min(MAX_CUSTOM_MM, Math.max(20, Number(cw) || 60)), h: Math.min(MAX_CUSTOM_MM, Math.max(15, Number(ch) || 40)) } : { id: base.id, w: base.w, h: base.h };
  const list = (): Sticker[] =>
    d.boxes.filter((b) => sel.has(b.id)).map((b) => {
      const g = gmap[b.group_id ?? ""];
      return { number: b.number, groupName: g?.name ?? "Без группы", color: g?.color ?? "#dddddd", icon: g?.icon ?? "📦", url: qr ? boxQrUrl(location.origin, b.id) : undefined, items: d.items.filter((i) => i.box_id === b.id).map((i) => i.name), photo: b.photo_url };
    });
  useEffect(() => {
    const first = list()[0];
    if (!first) return setPreview("");
    let live = true;
    drawSticker(first, fmt.w, fmt.h, style, content).then((u) => live && setPreview(u));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fid, cw, ch, qr, sel, style, content]);
  const run = async (fn: typeof stickersPdf) => {
    if (tooBig) { toast.error(`Слишком большая наклейка: максимум ${MAX_CUSTOM_MM}×${MAX_CUSTOM_MM} мм`); return; }
    setBusy(true);
    try { await fn(list(), fmt, style, content); } catch (e) { console.error(e); toast.error("Не получилось сделать наклейки"); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 pt-2">
      <h1 className="font-display text-2xl font-bold">Наклейки</h1>
      {d.boxes.length === 0 ? (
        <p className="text-muted-foreground">Сначала соберите сундуки.</p>
      ) : (
        <>
          {qr && host && isPreviewHost(host) && (
            <p className="rounded-2xl border-2 border-warning bg-warning/20 p-3 text-sm">⚠️ Печатайте с боевого адреса сайта — иначе QR будет вести на временный адрес.</p>
          )}
          <div className="space-y-2 rounded-2xl bg-card p-3">
            <p className="text-sm font-medium">Формат</p>
            <div className="grid grid-cols-2 gap-2">
              {FORMATS.map((f) => (
                <button key={f.id} onClick={() => setFid(f.id)} className={`rounded-xl px-2 py-2 text-left text-sm ${fid === f.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{f.label}</button>
              ))}
            </div>
            {fid === "custom" && (
              <div className="flex items-center gap-2">
                <Input inputMode="numeric" value={cw} onChange={(e) => setCw(e.target.value)} className="h-11" aria-label="Ширина, мм" />
                <span>×</span>
                <Input inputMode="numeric" value={ch} onChange={(e) => setCh(e.target.value)} className="h-11" aria-label="Высота, мм" />
                <span className="text-sm text-muted-foreground">мм</span>
              </div>
            )}
            {tooBig && <p className="text-sm text-destructive">Максимум {MAX_CUSTOM_MM}×{MAX_CUSTOM_MM} мм — больше принтеры наклеек не печатают.</p>}
          </div>
          <div className="space-y-2 rounded-2xl bg-card p-3">
            <p className="text-sm font-medium">Стиль</p>
            <div className="grid grid-cols-2 gap-2">
              {([["brand", "🐸 Фирменный", "цветная плашка и печать Розитты"], ["simple", "⬜ Простой", "чёрно-белый, для термопринтера"], ["emerald", "🌿 Изумрудный крафт", "для интерьера, жабка в QR"], ["cocoa", "🍫 Тёплый шоколад", "для дерева и крафта, жабка в QR"]] as const).map(([id, l, hint]) => (
                <button key={id} onClick={() => setStyle(id)} className={`rounded-xl px-2 py-2 text-left text-sm ${style === id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                  <span className="block font-medium">{l}</span><span className="block text-xs opacity-80">{hint}</span>
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">Для маленьких термоэтикеток (40×30, 50×30) лучше «Простой» или «Фирменный». Изумрудный и шоколадный — для цветного принтера и наклеек покрупнее; сначала напечатайте одну пробную.</p>
          </div>
          <div className="space-y-2 rounded-2xl bg-card p-3">
            <p className="text-sm font-medium">Что на наклейке</p>
            <div className="grid grid-cols-3 gap-2">
              {([["number", "№ Номер"], ["list", "📝 Список"], ["photo", "📷 Фото"]] as const).map(([id, l]) => (
                <button key={id} onClick={() => setContent(id)} className={`rounded-xl px-2 py-2 text-sm ${content === id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{l}</button>
              ))}
            </div>
            {content !== "number" && <p className="text-xs text-muted-foreground">{content === "list" ? "Первые вещи сундука под номером — удобно для обуви и сезонной одежды." : "Обложка сундука под номером. Нет фото — будет только номер."}</p>}
          </div>
          <label className="flex items-center justify-between rounded-2xl bg-card p-3">
            <span>QR-код на наклейке</span>
            <Switch checked={qr} onCheckedChange={setQr} />
          </label>
          {preview && (
            <div className="rounded-2xl bg-card p-3">
              <p className="mb-2 text-sm text-muted-foreground">Так будет выглядеть наклейка ({fmt.w}×{fmt.h} мм)</p>
              <img src={preview} alt="Предпросмотр наклейки" className="mx-auto max-h-56 rounded-md" style={{ aspectRatio: `${fmt.w} / ${fmt.h}` }} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {d.boxes.map((b) => {
              const g = gmap[b.group_id ?? ""];
              return (
                <button key={b.id} onClick={() => toggle(b.id)} className={`overflow-hidden rounded-xl border-2 bg-card text-left ${sel.has(b.id) ? "border-primary" : "border-transparent opacity-50"}`}>
                  <div className="truncate px-2 py-1 text-xs font-semibold" style={{ backgroundColor: g?.color ?? "transparent" }}>
                    {g ? `${g.icon} ${g.name}` : "Без группы"}
                  </div>
                  <div className="px-2 py-2 font-display text-3xl font-bold">{b.number}</div>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button className="h-14 rounded-2xl text-base" disabled={busy || sel.size === 0} onClick={() => run(stickersPdf)}>
              <Download className="h-5 w-5" /> {busy ? "Готовлю…" : `Скачать PDF (${sel.size})`}
            </Button>
            <Button variant="secondary" className="h-14 rounded-2xl text-base" disabled={busy || sel.size === 0} onClick={() => run(printStickers)}>
              <Printer className="h-5 w-5" /> Напечатать
            </Button>
            <Button variant="outline" className="col-span-2 h-12 rounded-2xl" disabled={busy || sel.size === 0} onClick={() => run(stickersPng)}>
              <ImageDown className="h-5 w-5" /> Скачать PNG — для приложения принтера
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
