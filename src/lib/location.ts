/** Splits "Спальня / Шкаф / Полка 3" (also →, >, \) into path parts. */
export const locationParts = (s: string | null | undefined) => (s ?? "").split(/\s*(?:\/|→|->|>|\\)\s*/).map((x) => x.trim()).filter(Boolean);

/** Days until a date (YYYY-MM-DD) from today; negative when passed. */
export function daysLeft(date: string, today = new Date()) {
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, m, d] = date.split("-").map(Number);
  return Math.round((Date.UTC(y!, m! - 1, d!) - t) / 86400000);
}
