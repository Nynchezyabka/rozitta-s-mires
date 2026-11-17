import type { CSSProperties, ReactNode } from "react";
import { tagIcon } from "@/lib/tags";

/** Glowing swamp-crystal chip for an item category: dark body, coloured rim and soft glow. */
export function TagChip({ tag, color, count, active, size = "md", onClick, children }: {
  tag: string; color: string; count?: number; active?: boolean; size?: "sm" | "md"; onClick?: () => void; children?: ReactNode;
}) {
  const style = {
    borderColor: `color-mix(in oklab, ${color} ${active ? 100 : 60}%, transparent)`,
    backgroundColor: `color-mix(in oklab, ${color} ${active ? 30 : 12}%, var(--card))`,
    boxShadow: active ? `0 0 14px color-mix(in oklab, ${color} 55%, transparent), inset 0 0 8px color-mix(in oklab, ${color} 30%, transparent)` : `0 0 6px color-mix(in oklab, ${color} 20%, transparent)`,
  } as CSSProperties;
  const cls = `inline-flex items-center gap-1.5 rounded-full border font-medium text-foreground transition ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1.5 text-sm"} ${onClick ? "hover:brightness-125 active:scale-95" : ""}`;
  const body = (
    <>
      <span aria-hidden>{tagIcon(tag)}</span>
      <span>{tag}</span>
      {count !== undefined && <span className="rounded-full bg-background/60 px-1.5 text-[0.7rem] text-muted-foreground">{count}</span>}
      {children}
    </>
  );
  return onClick
    ? <button type="button" onClick={onClick} aria-pressed={active} className={cls} style={style}>{body}</button>
    : <span className={cls} style={style}>{body}</span>;
}
