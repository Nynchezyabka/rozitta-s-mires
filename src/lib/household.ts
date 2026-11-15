import { useEffect, useState } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getHousehold } from "./store";

const KEY = "korobki-token";
const listeners = new Set<(t: string | null) => void>();

export function setToken(t: string | null) {
  if (t) localStorage.setItem(KEY, t);
  else localStorage.removeItem(KEY);
  listeners.forEach((l) => l(t));
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
