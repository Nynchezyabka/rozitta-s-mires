import { useEffect, useState } from "react";

export type XmasMode = "auto" | "on" | "off";
const KEY = "xmas-mode";
const subs = new Set<(m: XmasMode) => void>();

/** Auto: 15 Dec – 14 Jan. */
export function isXmasDate(d = new Date()) {
  const m = d.getMonth(), day = d.getDate();
  return (m === 11 && day >= 15) || (m === 0 && day <= 14);
}
export function setXmasMode(m: XmasMode) {
  localStorage.setItem(KEY, m);
  subs.forEach((s) => s(m));
}
export function useXmas() {
  const [mode, set] = useState<XmasMode>("auto");
  useEffect(() => {
    set((localStorage.getItem(KEY) as XmasMode) || "auto");
    subs.add(set);
    return () => void subs.delete(set);
  }, []);
  const on = mode === "on" || (mode === "auto" && isXmasDate());
  return { mode, on };
}
