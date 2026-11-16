import { useEffect, useState } from "react";
import rozitta from "@/assets/rozitta.webp";
import { PHRASES, pick, sfx } from "@/lib/rozitta";

/** Rozitta with a thought bubble; click for a quack and a new phrase. */
export function RozittaBubble({ phrases = PHRASES, size = "h-20 w-20" }: { phrases?: string[]; size?: string }) {
  const [text, setText] = useState("");
  useEffect(() => setText(pick(phrases)), [phrases]);
  return (
    <button type="button" onClick={() => { sfx.quack(); setText(pick(phrases)); }} className="flex w-full items-end gap-2 text-left">
      <img src={rozitta} alt="Розитта" className={`pixel bob shrink-0 ${size}`} />
      <span className="relative mb-6 rounded-2xl border-2 border-accent/70 bg-card/90 px-3 py-2 text-sm italic text-accent shadow-[0_0_14px_-4px_var(--accent)] backdrop-blur">
        {text}
      </span>
    </button>
  );
}
