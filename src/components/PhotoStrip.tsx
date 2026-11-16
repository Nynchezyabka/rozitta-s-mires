import { useRef } from "react";
import { ImagePlus, Star, X } from "lucide-react";
import { compressImage } from "@/lib/household";
import { MAX_PHOTOS } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/** Up to 5 photos of one chest: outside, inside, layers. First is the cover. Values are data: URLs (new) or storage paths (saved). */
export function PhotoStrip({ value, onChange, urlOf }: { value: string[]; onChange: (v: string[]) => void; urlOf?: (v: string) => string | undefined }) {
  const ref = useRef<HTMLInputElement>(null);
  const src = (v: string) => (v.startsWith("data:") ? v : urlOf?.(v) ?? "");
  const add = async (files: FileList | null) => {
    if (!files) return;
    const room = MAX_PHOTOS - value.length;
    try {
      const imgs = await Promise.all([...files].slice(0, room).map((f) => compressImage(f)));
      onChange([...value, ...imgs]);
    } catch {
      toast.error("Не получилось открыть фото. Попробуйте другой снимок.");
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {value.map((v, i) => (
          <div key={v.slice(-40) + i} className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 ${i === 0 ? "border-primary" : "border-border"}`}>
            <img src={src(v)} alt={`Фото ${i + 1}`} className="h-full w-full object-cover" />
            <Button type="button" variant="secondary" size="icon" title="Убрать фото" aria-label={`Убрать фото ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 h-7 w-7 bg-background text-foreground"><X /></Button>
            {i > 0 && <Button type="button" variant="secondary" size="icon" title="Сделать обложкой" aria-label={`Сделать фото ${i + 1} обложкой`} onClick={() => onChange([v, ...value.filter((_, j) => j !== i)])} className="absolute bottom-0.5 left-0.5 h-7 w-7 bg-background text-foreground"><Star /></Button>}
          </div>
        ))}
        {value.length < MAX_PHOTOS && (
          <Button type="button" variant="outline" onClick={() => ref.current?.click()} className="flex h-20 w-24 shrink-0 flex-col items-center justify-center gap-1 whitespace-normal rounded-lg border-2 border-dashed text-sm">
            <ImagePlus /> Добавить фото
          </Button>
        )}
      </div>
      <div className="border-l-2 border-primary bg-background px-3 py-2 text-base leading-relaxed text-foreground">
        <p className="font-medium">До {MAX_PHOTOS} фото · первое — обложка</p>
        <p>«Добавить фото» сохраняет снимки коробки и содержимого. Список вещей не меняется.</p>
      </div>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
    </div>
  );
}
