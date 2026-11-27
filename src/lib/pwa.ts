/** Only the published app may own an app-shell worker. */
export function refuseAppWorker(hostname: string, production: boolean, framed: boolean, disabled: boolean): boolean {
  const h = hostname.toLowerCase();
  const domain = /\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(h);
  const label = h.split(".")[0] ?? "";
  return !production || framed || disabled || h === "localhost" || h === "127.0.0.1"
    || (domain && /^(?:(?:id-preview|preview)(?:-[a-z0-9]+)?--.+|project--.+-dev)$/.test(label))
    || ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"].some((d) => h === d || h.endsWith(`.${d}`));
}

export async function unregisterAppWorker() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(registrations.filter((r) => [r.active, r.waiting, r.installing].some((w) => w && new URL(w.scriptURL).pathname === "/sw.js")).map((r) => r.unregister()));
}

export async function initOfflineApp() {
  let framed = true;
  try { framed = window.self !== window.top; } catch { /* refuse */ }
  if (refuseAppWorker(window.location.hostname, import.meta.env.PROD, framed, new URLSearchParams(window.location.search).get("sw") === "off")) {
    await unregisterAppWorker();
    return;
  }
  if (!("serviceWorker" in navigator)) return;
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
}