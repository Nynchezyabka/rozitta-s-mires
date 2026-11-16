import { useRef } from "react";
import { ImagePlus, Star, X } from "lucide-react";
import { compressImage } from "@/lib/household";
import { MAX_PHOTOS } from "@/lib/store";

/** Up to 5 photos of one chest: outside, inside, layers. First is the cover. Values are data: URLs (new) or storage paths (saved). */
export function PhotoStrip({ value, onChange, urlOf }: { value: string[]; onChange: (v: string[]) => void; urlOf?: (v: string) => string | undefined }) {
  const ref = useRef<HTMLInputElement>(null);
  const src = (v: string) => (v.startsWith("data:") ? v : urlOf?.(v) ?? "");
  const add = async (files: FileList | null) => {
    if (!files) return;
    const room = MAX_PHOTOS - value.length;
    const imgs = await Promise.all([...files].slice(0, room).map((f) => compressImage(f)));
    onChange([...value, ...imgs]);
  };
  return (
    <div className="space-y-1">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {value.map((v, i) => (
          <div key={v.slice(-40) + i} className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 ${i === 0 ? "border-primary" : "border-border"}`}>
            <img src={src(v)} alt={`Фото ${i + 1}`} className="h-full w-full object-cover" />
            <button aria-label="Убрать фото" onClick={() => onChange(value.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5"><X className="h-3 w-3" /></button>
            {i > 0 && <button aria-label="Сделать обложкой" onClick={() => onChange([v, ...value.filter((_, j) => j !== i)])} className="absolute bottom-0.5 left-0.5 rounded-full bg-background/80 p-0.5"><Star className="h-3 w-3" /></button>}
          </div>
        ))}
        {value.length < MAX_PHOTOS && (
          <button onClick={() => ref.current?.click()} className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-xs text-muted-foreground">
            <ImagePlus className="h-5 w-5" /> Фото
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">До {MAX_PHOTOS} фото: снаружи и внутри. Первое — обложка (★ переставит). Эти фото не распознаются.</p>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
    </div>
  );
}
