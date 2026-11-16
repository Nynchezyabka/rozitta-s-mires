/** Обновления и напоминания о копии. Без service worker: свежая версия приходит при перезагрузке страницы. */
export const APP_VERSION = "1.4.0";

function isPreview(): boolean {
  if (!import.meta.env.PROD) return true;
  try { if (window.self !== window.top) return true; } catch { return true; }
  const h = window.location.hostname.toLowerCase();
  return h === "localhost" || h.startsWith("id-preview--") || h.startsWith("preview--") || h.endsWith("lovableproject.com");
}

const scripts = (list: string[]) => list.map((s) => s.match(/assets\/[^"'?]+\.js/)?.[0]).filter(Boolean).sort().join();

/** Сравнивает файлы открытой версии со свежей страницей с сервера. */
export async function checkForUpdates(): Promise<"current" | "new" | "offline"> {
  try {
    const res = await fetch("/?_v=" + Date.now(), { cache: "no-store" });
    if (!res.ok) return "offline";
    const fresh = scripts([...(await res.text()).matchAll(/assets\/[^"']+\.js/g)].map((m) => m[0]));
    const now = scripts([...document.querySelectorAll("script[src]")].map((s) => (s as HTMLScriptElement).src));
    return fresh && now && fresh !== now ? "new" : "current";
  } catch { return "offline"; }
}

/** Сбрасывает сохранённые файлы сайта и перезагружает. Дом, ключи и настройки остаются. */
export async function hardReload() {
  try {
    if ("serviceWorker" in navigator) await Promise.allSettled((await navigator.serviceWorker.getRegistrations()).map((r) => r.unregister()));
    if ("caches" in window) await Promise.allSettled((await caches.keys()).map((k) => caches.delete(k)));
  } finally {
    const u = new URL(window.location.href);
    u.searchParams.set("v", String(Date.now()));
    window.location.replace(u.toString());
  }
}

const BACKUP_KEY = "rozitta-last-backup";
const HINT_KEY = "rozitta-backup-hint";
export const lastBackup = () => Number(localStorage.getItem(BACKUP_KEY) ?? 0) || null;
export const markBackup = () => localStorage.setItem(BACKUP_KEY, String(Date.now()));

const DAY = 86400000;
/** Напоминать раз в месяц, не чаще раза в неделю, и только если есть что сохранять. */
export function shouldRemindBackup(now: number, last: number | null, shown: number, boxes: number) {
  if (!boxes) return false;
  if (last && now - last < 30 * DAY) return false;
  return now - shown >= 7 * DAY;
}

let started = false;
/** Вызывать из useEffect. Мягкие тосты, ничего не перезагружает само. */
export function initUpdates(boxes: number) {
  if (typeof window === "undefined" || started) return;
  started = true;
  navigator.storage?.persist?.().catch(() => {});
  import("sonner").then(({ toast }) => {
    const now = Date.now();
    if (shouldRemindBackup(now, lastBackup(), Number(localStorage.getItem(HINT_KEY) ?? 0), boxes)) {
      localStorage.setItem(HINT_KEY, String(now));
      setTimeout(() => toast("🐸 Давно не было копии дома. Сохранить можно в ☰ → «Копия и обновления».", { duration: 8000 }), 4000);
    }
    if (isPreview()) return;
    const check = async () => {
      if ((await checkForUpdates()) === "new")
        toast("🐸 Розитта сварила новую версию", { id: "app-update", duration: Infinity, action: { label: "Обновить", onClick: () => window.location.reload() } });
    };
    void check();
    setInterval(check, 30 * 60 * 1000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") void check(); });
  });
}
