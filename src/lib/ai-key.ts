/** Own AI key: stored only in this browser; photos go straight from the browser to the chosen service. */
import { getHealth, healthCheckLine, medsPrompt } from "./health";
const KEY = "korobki-ai-key";
const MODEL_KEY = "korobki-ai-model";

export type ServiceId = "gemini" | "cnc" | "openrouter" | "local";
export type Service = { id: ServiceId; name: string; vpn: boolean };

/** Models per service; the first one is the default. Change names here if a service renames its models. */
export const MODELS: Record<ServiceId, string[]> = {
  cnc: ["claude-sonnet-5", "claude-sonnet-4-6", "claude-opus-5.5"],
  gemini: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"],
  openrouter: ["google/gemini-2.5-flash", "openai/gpt-4o-mini", "anthropic/claude-sonnet-4.5"],
  local: [],
};

export const SERVICES: Service[] = [
  { id: "gemini", name: "Google Gemini", vpn: true },
  { id: "cnc", name: "Claude n Codex", vpn: false },
  { id: "openrouter", name: "OpenRouter", vpn: false },
  { id: "local", name: "Локальная модель", vpn: false },
];
const SERVICE_KEY = "korobki-ai-service";
const LOCAL_KEY = "korobki-ai-local";
export type LocalCfg = { url: string; model: string; key: string };

export function detectService(key: string): Service | null {
  const k = key.trim();
  if (k.startsWith("AIza")) return { id: "gemini", name: "Google Gemini", vpn: true };
  if (k.startsWith("sk-myapi_")) return { id: "cnc", name: "Claude n Codex", vpn: false };
  if (k.startsWith("sk-or-")) return { id: "openrouter", name: "OpenRouter", vpn: false };
  return null;
}

export const getAiKey = () => (typeof window === "undefined" ? "" : localStorage.getItem(KEY) ?? "");
export const setAiKey = (k: string) => (k ? localStorage.setItem(KEY, k.trim()) : localStorage.removeItem(KEY));
/** Explicitly chosen service; falls back to guessing from the saved key. */
export function getService(): Service | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem(SERVICE_KEY);
  return SERVICES.find((x) => x.id === id) ?? detectService(getAiKey());
}
export const setService = (id: ServiceId) => localStorage.setItem(SERVICE_KEY, id);
export function getLocal(): LocalCfg {
  try {
    return { url: "", model: "", key: "", ...JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}") };
  } catch {
    return { url: "", model: "", key: "" };
  }
}
export const setLocal = (c: LocalCfg) =>
  localStorage.setItem(LOCAL_KEY, JSON.stringify({ url: c.url.trim().replace(/\/+$/, ""), model: c.model.trim(), key: c.key.trim() }));
/** True when the user set up their own AI (key or own server). */
export function isAiConfigured() {
  const s = getService();
  if (!s) return false;
  if (s.id === "local") { const c = getLocal(); return !!(c.url && c.model); }
  return !!getAiKey();
}

/** Own OpenAI-compatible server (LM Studio etc.): explain network failures in plain words. */
/** Lets the user stop a slow local recognition. */
let localCtl: AbortController | null = null;
export function cancelLocal() { localCtl?.abort("cancel"); }
/** Remove <think>…</think> reasoning that some local models print before the answer. */
export const stripThinking = (t: string) => t.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/^[\s\S]*<\/think>/i, "").trim();

async function localFetch(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  if (typeof location !== "undefined" && location.protocol === "https:" && url.startsWith("http:"))
    throw new Error("Страница открыта по https, а адрес сервера — по http: браузер такое блокирует. Нужен https-адрес, например через Tailscale.");
  const ctl = new AbortController();
  localCtl = ctl;
  const t = setTimeout(() => ctl.abort("timeout"), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } catch (e) {
    console.error("[Своя модель]", e);
    if (ctl.signal.aborted) throw new Error(ctl.signal.reason === "cancel" ? "Распознавание отменено — можно вписать вещи вручную." : "Модель думала больше 5 минут. Попробуйте модель полегче или фото с меньшим числом вещей.");
    throw new Error("Сервер не отвечает или блокирует запросы с этого сайта (CORS). Проверьте адрес, что сервер запущен, и включите CORS (в LM Studio: «Enable CORS»).");
  } finally {
    clearTimeout(t);
    if (localCtl === ctl) localCtl = null;
  }
}
const authH = (key: string): Record<string, string> => (key ? { authorization: `Bearer ${key}` } : {});

export async function listLocalModels(c: Pick<LocalCfg, "url" | "key">): Promise<string[]> {
  const url = c.url.trim().replace(/\/+$/, "");
  if (!url) throw new Error("Впишите адрес сервера");
  const r = await localFetch(`${url}/v1/models`, { headers: authH(c.key.trim()) }, 15000);
  if (!r.ok) {
    console.error("[Своя модель] /v1/models", r.status, await r.text().catch(() => ""));
    throw new Error(r.status === 401 || r.status === 403 ? "Сервер найден, но не принял ключ." : `Сервер найден, но ответил ошибкой ${r.status}.`);
  }
  const j = await r.json().catch(() => ({}));
  return Array.isArray(j?.data) ? j.data.map((m: { id?: string }) => m.id).filter(Boolean) : [];
}

async function callLocal(prompt: string, photo?: string): Promise<string> {
  const c = getLocal();
  const content: unknown[] = [{ type: "text", text: prompt }];
  if (photo) content.push({ type: "image_url", image_url: { url: photo } });
  const r = await localFetch(`${c.url}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authH(c.key) },
    body: JSON.stringify({ model: c.model, messages: [{ role: "user", content }] }),
  }, 300000);
  if (!r.ok) await fail(r, { id: "local", name: "Локальная модель", vpn: false }, c.model);
  const j = await r.json();
  return stripThinking(j.choices?.[0]?.message?.content ?? "");
}

const modelStore = (id: ServiceId) => `${MODEL_KEY}-${id}`;
export const getModel = (id: ServiceId) =>
  (typeof window === "undefined" ? null : localStorage.getItem(modelStore(id))) || MODELS[id][0]!;
export const setModel = (id: ServiceId, m: string) => localStorage.setItem(modelStore(id), m.trim());

async function fail(r: Response, s: Service, model: string): Promise<never> {
  const body = await r.text().catch(() => "");
  console.error(`[${s.name}] HTTP ${r.status}, модель ${model}:`, body);
  let msg = `${s.name} ответил ошибкой ${r.status}: ${body.slice(0, 200)}`;
  if (r.status === 400 && /model/i.test(body)) msg += ` — проверьте название модели («${model}») в настройках.`;
  else if (r.status === 400) msg += ` — возможно, сервис не знает модель «${model}».`;
  if (s.vpn) msg += " (из России нужен VPN)";
  throw new Error(msg);
}

/** Each thing gets its own short tag; any topic is fine, no fixed list. */
export const TAG_LINE = 'Каждой вещи дай метку category: 1–2 слова, к чему она относится (например "Электроника", "Аквариум", "Косметика", "Инструменты"). Подойдёт любая тема, придумай сама.';
export const groupLine = (names: string[]) =>
  `group — общая группа для всего фото. Если подходит одна из групп дома (${names.join(", ")}), напиши её. Если нет — придумай короткое название новой группы. Если вещи совсем разные — "Разное".`;

export const knownTagLine = (tags: string[]) => (tags.length ? `Сначала выбирай метку из уже существующих в доме: ${tags.join(", ")}. Новую придумывай, только если ни одна не подходит.` : "");

export function buildPrompt(mode: "box" | "books" | "meds", groupNames: string[], tags: string[] = []) {
  const task =
    mode === "meds"
      ? medsPrompt(getHealth(), false)
      : mode === "books"
      ? `На фото обложки или корешки книг. Для каждой книги верни название (name) и автора (author). Если не уверен — needs_review: true. Старые книги без ISBN часто читаются плохо — тогда тоже needs_review: true.`
      : `На фото могут быть любые вещи: содержимое коробки или шкафа, книги, лекарства. Перечисли всё коротко по-русски (name), объединяя однотипные ("Полотенца, 4 шт"). Для книги укажи автора (author), если читается. Для лекарства добавь к названию коротко, от чего оно ("Нурофен — от боли и температуры"). Не больше 25 пунктов. needs_review: true, если вещь видна плохо.${healthCheckLine(getHealth())}`;
  return `${task}
${TAG_LINE} Для книги метка category — её жанр (например "Фантастика", "Детектив", "Классика", "Детские", "Психология", "Кулинария"), а не просто "Книги". ${knownTagLine(tags)}
${groupLine(groupNames)}
Верни только JSON без пояснений: {"items":[{"name":"...","category":"...","author":null,"needs_review":false}],"group":"..."}`;
}

export type Recognized = { items: { name: string; author?: string | null; needs_review?: boolean; category?: string | null }[]; group: string | null };

async function call(key: string, prompt: string, photo?: string, svc?: Service | null): Promise<string> {
  const s = svc ?? getService() ?? detectService(key);
  if (!s) throw new Error("Выберите сервис в настройках ИИ");
  if (s.id === "local") return callLocal(prompt, photo);
  const model = getModel(s.id);
  if (s.id === "cnc") {
    const content: unknown[] = [];
    if (photo) {
      const [head, data] = photo.split(",");
      content.push({ type: "image", source: { type: "base64", media_type: (head ?? "").match(/data:(.*?);/)?.[1] ?? "image/jpeg", data } });
    }
    content.push({ type: "text", text: prompt });
    const r = await fetch("https://claude-n-codex.com:8443/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model, max_tokens: 2000, messages: [{ role: "user", content }] }),
    });
    if (!r.ok) await fail(r, s, model);
    const j = await r.json();
    return (j.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
  }
  const url = s.id === "gemini" ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" : "https://openrouter.ai/api/v1/chat/completions";
  const content: unknown[] = [{ type: "text", text: prompt }];
  if (photo) content.push({ type: "image_url", image_url: { url: photo } });
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content }] }),
  });
  if (!r.ok) await fail(r, s, model);
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

export async function testKey(key: string, svc?: Service) {
  const t = await call(key, "Ответь одним словом: ок", undefined, svc);
  return t.trim().length > 0;
}

export async function recognizeWithKey(key: string, photo: string, mode: "box" | "books" | "meds", groupNames: string[], tags: string[] = []): Promise<Recognized> {
  const text = stripThinking(await call(key, buildPrompt(mode, groupNames, tags), photo));
  const block = text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? text;
  let p: Partial<Recognized>;
  try {
    p = JSON.parse(block.match(/\{[\s\S]*\}/)?.[0] ?? "");
  } catch {
    console.error("[ИИ] непонятный ответ:", text);
    throw new Error("Модель ответила непонятно — добавьте вещи вручную");
  }
  return {
    items: Array.isArray(p.items) ? p.items.filter((x) => x && typeof x.name === "string").map((x) => ({ ...x, category: typeof x.category === "string" ? x.category : null })) : [],
    group: typeof p.group === "string" ? p.group : null,
  };
}

export const categorizePrompt = (names: string[], known: string[]) => `Разложи домашние вещи по категориям. Категория — 1–2 слова по-русски с большой буквы ("Одежда", "Декор", "Оптика"). Для книги (название с автором в скобках) категория — жанр ("Фантастика", "Детектив", "Классика"), а не "Книги". ${known.length ? `Если подходит одна из уже существующих категорий (${known.join(", ")}), используй её.` : ""}
Вещи:
${names.map((n, i) => `${i + 1}. ${n}`).join("\n")}
Верни только JSON: {"items":[{"name":"...","category":"..."}]} — в том же порядке, по одной записи на каждую вещь.`;

export function parseCategories(text: string, names: string[]): Record<string, string> {
  const t = stripThinking(text);
  const block = t.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? t;
  const p = JSON.parse(block.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as { items?: { name?: string; category?: string }[] };
  const out: Record<string, string> = {};
  (p.items ?? []).forEach((x, i) => {
    const c = typeof x?.category === "string" ? x.category.trim() : "";
    const n = names.includes(x?.name ?? "") ? (x.name as string) : names[i];
    if (c && n) out[n] = c;
  });
  return out;
}

export async function categorizeWithKey(key: string, names: string[], known: string[]) {
  return parseCategories(await call(key, categorizePrompt(names, known)), names);
}
