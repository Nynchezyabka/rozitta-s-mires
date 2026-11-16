/** Household health notes for the medicine chest: stored in this browser, sent to the chosen AI service with the prompt. Never send them to a shared server trial. */
const KEY = "rozitta-health";
export const HEALTH_FLAGS = [
  { id: "pregnant", label: "🤰 Беременность" },
  { id: "breastfeeding", label: "🍼 Грудное вскармливание" },
  { id: "kids", label: "👶 Дети в доме" },
  { id: "driving", label: "🚗 За рулём" },
] as const;
export type HealthFlag = (typeof HEALTH_FLAGS)[number]["id"];
export type Health = { flags: HealthFlag[]; notes: string };

export function getHealth(): Health {
  try {
    return { flags: [], notes: "", ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { flags: [], notes: "" };
  }
}
export const setHealth = (h: Health) => localStorage.setItem(KEY, JSON.stringify({ flags: h.flags, notes: h.notes.trim() }));

/** Words for the prompt: which conditions to check each medicine against. */
export function healthContext(h: Health): string {
  const parts = HEALTH_FLAGS.filter((f) => h.flags.includes(f.id)).map((f) => f.label.replace(/^\S+\s/, "").toLowerCase());
  if (h.notes) parts.push(`личные противопоказания: ${h.notes}`);
  return parts.join("; ");
}

export function medsPrompt(h: Health, forPaste: boolean): string {
  const ctx = healthContext(h);
  const sensitive = h.flags.some((f) => f === "pregnant" || f === "breastfeeding" || f === "kids");
  const green = sensitive ? "🟢 нет известных запретов, уточните у врача или фармацевта" : "🟢 нет известных запретов по инструкции";
  const check = ctx
    ? ` Проверь совместимость с: ${ctx}. В конце строки поставь метку: ${green}, 🟡 с осторожностью/по назначению врача, 🔴 нельзя — и в двух-трёх словах почему.`
    : "";
  const line = `Каждое лекарство одной строкой: "Название (действующее вещество) — от чего, простыми словами"${check} Если виден срок годности — добавь "годен до ММ.ГГГГ (проверьте по упаковке)".`;
  return forPaste
    ? `На фото лекарства из домашней аптечки. ${line} По одной строке на лекарство, без нумерации и пояснений.`
    : `На фото лекарства из домашней аптечки. В поле name пиши: ${line} needs_review: true, если название читается плохо.`;
}
