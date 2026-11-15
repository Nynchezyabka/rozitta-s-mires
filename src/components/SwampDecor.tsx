import { useState } from "react";
import bg from "@/assets/swamp-bg.jpg";
import spider from "@/assets/spider.png";
import peony from "@/assets/peony.png";
import cabbage from "@/assets/cabbage.png";
import { useXmas } from "@/lib/season";

const sparks = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i * 0.7) % 9,
  dur: 7 + ((i * 3) % 6),
  size: 4 + (i % 4) * 2,
  kind: i % 3,
}));

function Spider({ side, len }: { side: string; len: number }) {
  const [up, setUp] = useState(false);
  return (
    <button
      aria-label="Весёлый паучок"
      onClick={() => setUp((v) => !v)}
      className={`pointer-events-auto fixed top-14 z-[2] flex flex-col items-center transition-transform duration-700 ${side}`}
      style={{ transform: `translateY(${up ? -len + 10 : 0}px)` }}
    >
      <span className="w-px bg-foreground/50" style={{ height: len }} />
      <img src={spider} alt="" className="pixel spider-sway -mt-2 h-12 w-12" />
    </button>
  );
}

const flakes = Array.from({ length: 40 }, (_, i) => ({ left: (i * 53) % 100, delay: (i * 0.9) % 12, dur: 8 + (i % 7), size: 3 + (i % 3) * 2 }));

export function SwampDecor() {
  const { on: xmas } = useXmas();
  return (
    <>
      {xmas && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[3] overflow-hidden">
          {flakes.map((f, i) => (
            <span key={i} className="snowflake" style={{ left: `${f.left}%`, width: f.size, height: f.size, animationDelay: `${f.delay}s`, animationDuration: `${f.dur}s` }} />
          ))}
        </div>
      )}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <img src={bg} alt="" width={1024} height={1792} className="pixel h-full w-full object-cover opacity-80" />
        <div className="aurora absolute inset-0" />
      </div>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {sparks.map((s, i) => (
          <span
            key={i}
            className={`magic-spark spark-${s.kind}`}
            style={{ left: `${s.left}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }}
          />
        ))}
        <img src={peony} alt="" className="pixel absolute -left-6 bottom-16 h-32 w-32 opacity-90" />
        <img src={cabbage} alt="" className="pixel absolute -right-4 bottom-20 h-28 w-28 opacity-90" />
        <img src={peony} alt="" className="pixel absolute -right-8 top-1/3 h-24 w-24 rotate-12 opacity-60" />
        <img src={cabbage} alt="" className="pixel absolute -left-6 top-1/2 h-20 w-20 opacity-60" />
      </div>
      <Spider side="left-6" len={60} />
      <Spider side="right-10" len={110} />
    </>
  );
}
