import { createStore, get, set, del } from "idb-keyval";

type Snapshot<T> = { value: T; savedAt: number };
const resources = ["k_get", "k_things", "k_clothes", "k_outfits", "k_trash"];
const listeners = new Set<() => void>();
const stale = new Map<string, number>();
let database: ReturnType<typeof createStore> | undefined;
const db = () => database ??= createStore("rozitta-offline-v1", "snapshots");
const key = (token: string, resource: string) => `${import.meta.env['VITE_SUPABASE_URL']}|${token}|${resource}`;
export const offlineResources = resources;
export const subscribeOffline = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const offlineSavedAt = (token: string) => stale.get(token) ?? null;
function changed() { listeners.forEach((f) => f()); }

export function isConnectionError(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof Error && /failed to fetch|networkerror|load failed|network request failed|проверьте интернет/i.test(error.message));
}

export function assertOnline() {
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("Нет связи. Сейчас доступно только чтение; ничего не сохранено.");
}

export async function clearOfflineHouse(token: string) {
  await Promise.allSettled(resources.map((r) => del(key(token, r), db())));
  stale.delete(token);
  changed();
}

/** Only transport failures can use a local snapshot; access denials must never resurrect data. */
export async function readOffline<T>(token: string, resource: string, load: () => Promise<T>): Promise<T> {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) throw new TypeError("Network offline");
    const value = await load();
    try { await set(key(token, resource), { value, savedAt: Date.now() }, db()); } catch { /* quota/private mode must not block online reads */ }
    if (resource === "k_get") { stale.delete(token); changed(); }
    return value;
  } catch (error) {
    if (!isConnectionError(error)) {
      if (resource === "k_get") await clearOfflineHouse(token);
      throw error;
    }
    let snapshot: Snapshot<T> | undefined;
    try { snapshot = await get<Snapshot<T>>(key(token, resource), db()); } catch { /* unavailable storage */ }
    if (!snapshot) throw new Error("Нет связи, а копии этого раздела на устройстве ещё нет. Откройте его с интернетом.");
    stale.set(token, snapshot.savedAt);
    changed();
    return snapshot.value;
  }
}