import { useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { gardenPlantings, HABITATS, LAYERS, type GardenId, type GardenPlant } from "@/lib/garden";
import landscape from "@/assets/garden-landscape.jpg";
import lily from "@/assets/bloom-lily.png";
import lily2 from "@/assets/bloom-lily2.png";
import kiwi from "@/assets/bloom-kiwi.png";
import romanesco from "@/assets/bloom-romanesco.png";
import eryngium from "@/assets/bloom-eryngium.png";
import veggie from "@/assets/bloom-veggie.png";
import chrysanthemum from "@/assets/bloom-chrysanthemum.png";
import peony from "@/assets/bloom-peony.png";
import mushroom from "@/assets/garden-mushroom.png";
import fern from "@/assets/garden-fern.png";
import copperFern from "@/assets/garden-copper-fern.png";
import ajuga from "@/assets/garden-ajuga.png";
import veronica from "@/assets/garden-veronica.png";
import moneywort from "@/assets/garden-moneywort.png";
import dogwood from "@/assets/garden-dogwood.png";
import hosta from "@/assets/garden-hosta.png";
import willow from "@/assets/garden-willow.png";
import frog from "@/assets/garden-frog.png";
import { sfx } from "@/lib/rozitta";

const FROGS = [{ x: 70, y: 63 }, { x: 88, y: 79 }, { x: 58, y: 90 }];
const SPARKS = Array.from({ length: 14 }, (_, i) => ({ x: (i * 37 + 11) % 96 + 2, y: (i * 53 + 17) % 80 + 10, d: (i % 5) * 0.9 }));

const PICS: Record<GardenId, string> = {
  lily, lily2, kiwi, romanesco, eryngium, veggie, chrysanthemum, peony,
  mushroom, fern, "copper-fern": copperFern, ajuga, veronica, moneywort, dogwood, hosta,
};

export function GardenScene({ total, fresh, night, hop }: { total: number; fresh: GardenId | null; night: boolean; hop: number }) {
  const [selected, setSelected] = useState<GardenPlant | null>(null);
  const [jumping, setJumping] = useState<number | null>(null);
  const jump = (i: number) => { setJumping(null); requestAnimationFrame(() => setJumping(i)); sfx.quack(); };
  const plantings = gardenPlantings(total);
  return (
    <>
      <div className={`garden-scene ${night ? "garden-night" : ""}`} role="group" aria-label="Ярусный сад Розитты">
        <img src={landscape} alt="Таинственный сад: красные ветви дёрена на опушке, папоротники в тени, цветочная поляна и пруд" width={1536} height={1024} className="pixel h-full w-full object-cover" />
        <img src={willow} alt="Плакучая ива над прудом" width={351} height={360} className="pixel garden-willow" />
        {plantings.map((plant) => (
          <Button key={plant.id} variant="ghost" aria-label={plant.name} title={plant.name}
            onClick={() => setSelected(plant)}
            className={`garden-plant ${fresh === plant.id ? "garden-plant-fresh" : ""} ${plant.id === "mushroom" ? "garden-mushroom" : ""}`}
            style={{ "--plant-x": `${plant.x}%`, "--plant-y": `${plant.y}%`, "--plant-width": `${plant.size}%`, "--plant-depth": Math.round(plant.y) } as CSSProperties}>
            {Array.from({ length: plant.copies }, (_, i) => (
              <img key={i} src={PICS[plant.id]} alt="" width={320} height={400} loading="lazy"
                className={`pixel garden-sprite garden-sprite-${i}`} />
            ))}
          </Button>
        ))}
        <div className="garden-fog garden-fog-1" aria-hidden />
        <div className="garden-fog garden-fog-2" aria-hidden />
        {SPARKS.map((p, i) => <span key={i} aria-hidden className="garden-spark" style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${p.d}s` } as CSSProperties} />)}
        {FROGS.map((f, i) => (
          <button key={`${i}-${hop}`} type="button" aria-label="Лягушка — квакнуть" onClick={() => jump(i)} onAnimationEnd={() => setJumping(null)}
            className={`garden-frog ${jumping === i || (hop > 0 && i === hop % FROGS.length) ? "garden-frog-jump" : ""}`}
            style={{ left: `${f.x}%`, top: `${f.y}%` } as CSSProperties}>
            <img src={frog} alt="" width={146} height={160} className="pixel h-full w-full object-contain" style={{ transform: i % 2 ? "scaleX(-1)" : undefined }} />
          </button>
        ))}
      </div>
      <div className="min-h-16 border-b border-border/60 py-3" aria-live="polite">
        {selected ? <>
          <p className="text-sm font-semibold text-primary">{selected.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{selected.botanical} · {LAYERS[selected.layer]} · {HABITATS[selected.habitat]}</p>
        </> : <p className="text-sm text-muted-foreground">{total === 0 ? "Пруд ждёт первую кувшинку. Розитта никуда не торопится." : "Всё, что здесь выросло, остаётся с тобой."}</p>}
      </div>
    </>
  );
}