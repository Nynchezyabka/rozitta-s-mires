import { useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { gardenPlantings, potagerPlantings, HABITATS, LAYERS, type GardenPlant, type Room } from "@/lib/garden";
import potagerBg from "@/assets/potager.webp";
import chard from "@/assets/potager-chard.webp";
import artichoke from "@/assets/potager-artichoke.webp";
import kale from "@/assets/potager-kale.webp";
import herbs from "@/assets/potager-herbs.webp";
import calendula from "@/assets/potager-calendula.webp";
import strawberry from "@/assets/potager-strawberry.webp";
import landscape from "@/assets/garden-woodland.webp";
import lily from "@/assets/bloom-lily.webp";
import lily2 from "@/assets/bloom-lily2.webp";
import kiwi from "@/assets/bloom-kiwi.webp";
import romanesco from "@/assets/bloom-romanesco.webp";
import eryngium from "@/assets/bloom-eryngium.webp";
import veggie from "@/assets/bloom-veggie.webp";
import chrysanthemum from "@/assets/bloom-chrysanthemum.webp";
import peony from "@/assets/bloom-peony.webp";
import mushroom from "@/assets/garden-mushroom.png";
import fern from "@/assets/garden-fern.png";
import copperFern from "@/assets/garden-copper-fern.png";
import ajuga from "@/assets/garden-ajuga.png";
import veronica from "@/assets/garden-veronica.png";
import moneywort from "@/assets/garden-moneywort.png";
import dogwood from "@/assets/garden-dogwood.png";
import hosta from "@/assets/garden-hosta.png";
import frog from "@/assets/garden-frog.png";
import { sfx } from "@/lib/rozitta";

const FROGS = [{ x: 52, y: 62 }, { x: 66, y: 66 }, { x: 86, y: 70 }];
const LIGHTS = [{ x: 10, y: 19, s: 9 }, { x: 91, y: 25, s: 8 }, { x: 89, y: 60, s: 10 }, { x: 22, y: 18, s: 14 }, { x: 25, y: 30, s: 10 }];
const SPARKS = Array.from({ length: 14 }, (_, i) => ({ x: (i * 37 + 11) % 96 + 2, y: (i * 53 + 17) % 80 + 10, d: (i % 5) * 0.9 }));

const POTAGER_LIGHTS = [{ x: 7, y: 18, s: 10 }, { x: 74, y: 22, s: 12 }, { x: 30, y: 52, s: 9 }, { x: 62, y: 70, s: 9 }];

const PICS: Record<GardenPlant["id"], string> = {
  "p-romanesco": romanesco, "p-cabbage": veggie, chard, artichoke, kale, herbs, calendula, strawberry,
  lily, lily2, kiwi, romanesco, eryngium, veggie, chrysanthemum, peony,
  mushroom, fern, "copper-fern": copperFern, ajuga, veronica, moneywort, dogwood, hosta,
};

export function GardenScene({ room, count, fresh, night, hop, unlocked, onPass }: {
  room: Room; count: number; fresh: string | null; night: boolean; hop: number; unlocked: boolean; onPass: () => void;
}) {
  const total = count;
  const pond = room === "pond";
  const [selected, setSelected] = useState<GardenPlant | null>(null);
  const [jumping, setJumping] = useState<number | null>(null);
  const jump = (i: number) => { setJumping(null); requestAnimationFrame(() => setJumping(i)); sfx.quack(); };
  const plantings = pond ? gardenPlantings(total) : potagerPlantings(total);
  return (
    <>
      <div className={`garden-scene ${night ? "garden-night" : ""}`} role="group" aria-label={pond ? "Ярусный сад Розитты" : "Огород потаже"}>
        {pond
          ? <img src={landscape} alt="Лесной теневой сад: ива на берегу склоняется над прудом с кувшинками, арка с огоньками, скамья и тропинка" width={1536} height={1024} className="pixel h-full w-full object-cover" />
          : <img src={potagerBg} alt="Огород потаже: приподнятые грядки с плетёными бортиками, ивовые обелиски, терракотовые горшки и калитка в лес" width={1536} height={1024} className="pixel h-full w-full object-cover" />}
        <button type="button" onClick={onPass} className={`garden-passage ${unlocked ? "garden-passage-open" : ""}`}
          style={(pond ? { left: "13%", top: "12%", width: "14%", height: "24%" } : { left: "3%", top: "52%", width: "25%", height: "40%" }) as CSSProperties}
          aria-label={pond ? (unlocked ? "Пройти через арку в огород потаже" : "Арка — тропинка пока заросла") : "Калитка — вернуться к лесному пруду"}
          title={pond ? (unlocked ? "В огород потаже" : "Тропинка пока заросла") : "К лесному пруду"} />
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
        {night && (pond ? LIGHTS : POTAGER_LIGHTS).map((l, i) => <span key={`l${i}`} aria-hidden className="garden-light" style={{ left: `${l.x}%`, top: `${l.y}%`, width: `${l.s}%`, animationDelay: `${i * 0.7}s` } as CSSProperties} />)}
        <div className="garden-fog garden-fog-1" aria-hidden />
        <div className="garden-fog garden-fog-2" aria-hidden />
        {SPARKS.map((p, i) => <span key={i} aria-hidden className="garden-spark" style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${p.d}s` } as CSSProperties} />)}
        {pond && FROGS.map((f, i) => (
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
        </> : <p className="text-sm text-muted-foreground">{total === 0 ? (pond ? "Пруд ждёт первую кувшинку. Розитта никуда не торопится." : "Грядки ждут первый шаг. Следующий посадит романеско.") : "Всё, что здесь выросло, остаётся с тобой."}</p>}
      </div>
    </>
  );
}