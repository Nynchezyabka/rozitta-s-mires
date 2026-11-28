import { useEffect, useState } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getHousehold } from "./store";
import { clearOfflineHouse } from "./offline-store";

const KEY = "korobki-token";
const listeners = new Set<(t: string | null) => void>();

const LIST = "korobki-houses";
const listListeners = new Set<(l: string[]) => void>();

/** All houses (tokens) this device knows: дом, дача… */
export function getHouses(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(LIST) ?? "[]");
    const list: string[] = Array.isArray(v) ? v : [];
    const cur = localStorage.getItem(KEY);
    return cur && !list.includes(cur) ? [cur, ...list] : list;
  } catch { return []; }
}
function saveHouses(l: string[]) {
  localStorage.setItem(LIST, JSON.stringify(l));
  listListeners.forEach((f) => f(l));
}

export function setToken(t: string | null) {
  const list = getHouses();
  if (t) {
    localStorage.setItem(KEY, t);
    if (!list.includes(t)) saveHouses([...list, t]);
  } else {
    const cur = localStorage.getItem(KEY);
    if (cur) void clearOfflineHouse(cur);
    const rest = list.filter((x) => x !== cur);
    saveHouses(rest);
    if (rest[0]) { localStorage.setItem(KEY, rest[0]); t = rest[0]; }
    else localStorage.removeItem(KEY);
  }
  listeners.forEach((l) => l(t));
}

export function useHouses() {
  const [list, set] = useState<string[]>([]);
  useEffect(() => {
    set(getHouses());
    listListeners.add(set);
    return () => void listListeners.delete(set);
  }, []);
  return list;
}

/** undefined = still reading storage (first render / SSR). */
export function useToken() {
  const [token, set] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    set(localStorage.getItem(KEY));
    listeners.add(set);
    return () => void listeners.delete(set);
  }, []);
  return token;
}

export const householdQuery = (token: string) =>
  queryOptions({ queryKey: ["household", token], queryFn: () => getHousehold({ data: { token } }) });

export function useHousehold() {
  const token = useToken();
  const q = useQuery({ ...householdQuery(token ?? ""), enabled: !!token });
  return { token, ...q };
}

export type { HouseholdData } from "./store";

export async function compressImage(file: File, max = 1400): Promise<string> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = url;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL("image/jpeg", 0.82);
}
