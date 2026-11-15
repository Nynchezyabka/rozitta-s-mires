/** Own AI key: stored only in this browser; photos go straight from the browser to the chosen service. */
const KEY = "korobki-ai-key";

export type Service = { id: "gemini" | "cnc" | "openrouter"; name: string; vpn: boolean };

export function detectService(key: string): Service | null {
  const k = key.trim();
  if (k.startsWith("AIza")) return { id: "gemini", name: "Google Gemini", vpn: true };
  if (k.startsWith("sk-myapi_")) return { id: "cnc", name: "Claude n Codex", vpn: false };
  if (k.startsWith("sk-or-")) return { id: "openrouter", name: "OpenRouter", vpn: false };
  return null;
}

export const getAiKey = () => (typeof window === "undefined" ? "" : localStorage.getItem(KEY) ?? "");
export const setAiKey = (k: string) => (k ? localStorage.setItem(KEY, k.trim()) : localStorage.removeItem(KEY));

export function buildPrompt(mode: "box" | "books", groupNames: string[]) {
  const task =
    mode === "books"
      ? `На фото обложки или корешки книг. Для каждой книги верни название (name) и автора (author). Если не уверен — needs_review: true. Старые книги без ISBN часто читаются плохо — тогда тоже needs_review: true.`
      : `На фото открытая коробка с вещами при переезде. Перечисли вещи коротко по-русски (name), объединяя однотипные ("Полотенца, 4 шт"). Не больше 25 пунктов. needs_review: true, если вещь видна плохо.`;
  return `${task}
Предложи одну группу из списка: ${groupNames.join(", ")}. Если не подходит ни одна — "Решить позже".
Верни только JSON без пояснений: {"items":[{"name":"...","author":null,"needs_review":false}],"group":"..."}`;
}

export type Recognized = { items: { name: string; author?: string | null; needs_review?: boolean }[]; group: string | null };

async function call(key: string, prompt: string, photo?: string): Promise<string> {
  const s = detectService(key);
  if (!s) throw new Error("Не узнаю этот ключ");
  if (s.id === "cnc") {
    const content: unknown[] = [];
    if (photo) {
      const [head, data] = photo.split(",");
      content.push({ type: "image", source: { type: "base64", media_type: head.match(/data:(.*?);/)?.[1] ?? "image/jpeg", data } });
    }
    content.push({ type: "text", text: prompt });
    const r = await fetch("https://claude-n-codex.com:8443/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 2000, messages: [{ role: "user", content }] }),
    });
    if (!r.ok) throw new Error(`Сервис ответил ошибкой ${r.status}`);
    const j = await r.json();
    return (j.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
  }
  const url = s.id === "gemini" ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" : "https://openrouter.ai/api/v1/chat/completions";
  const model = s.id === "gemini" ? "gemini-2.5-flash" : "google/gemini-2.5-flash";
  const content: unknown[] = [{ type: "text", text: prompt }];
  if (photo) content.push({ type: "image_url", image_url: { url: photo } });
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content }] }),
  });
  if (!r.ok) throw new Error(`Сервис ответил ошибкой ${r.status}${s.vpn ? " (из России нужен VPN)" : ""}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

export async function testKey(key: string) {
  const t = await call(key, "Ответь одним словом: ок");
  return t.trim().length > 0;
}

export async function recognizeWithKey(key: string, photo: string, mode: "box" | "books", groupNames: string[]): Promise<Recognized> {
  const text = await call(key, buildPrompt(mode, groupNames), photo);
  const m = text.match(/\{[\s\S]*\}/);
  const p = JSON.parse(m?.[0] ?? "{}") as Partial<Recognized>;
  return {
    items: Array.isArray(p.items) ? p.items.filter((x) => x && typeof x.name === "string") : [],
    group: typeof p.group === "string" ? p.group : null,
  };
}
