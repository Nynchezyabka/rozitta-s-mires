export const DEFAULT_GROUPS = [
  { name: "Постель и текстиль", color: "#7FA7C9", icon: "🛏️" },
  { name: "Детское", color: "#F2B84B", icon: "🧸" },
  { name: "Документы и бумаги", color: "#8C7B6B", icon: "📄" },
  { name: "Кухня", color: "#D9694A", icon: "🍳" },
  { name: "Одежда", color: "#8FB573", icon: "👕" },
  { name: "Книги", color: "#A57BC4", icon: "📚" },
  { name: "Решить позже", color: "#B0B0B0", icon: "⏳" },
];
export const GROUP_COLORS = ["#7FA7C9", "#F2B84B", "#8C7B6B", "#D9694A", "#8FB573", "#A57BC4", "#E58FB0", "#4FB3A9", "#B0B0B0"];
export const GROUP_ICONS = ["📦", "🛏️", "🧸", "📄", "🍳", "👕", "📚", "⏳", "🔧", "🎄", "🏡", "🧴", "🎨", "💡"];

/** Pick the suggested group by name (case-insensitive), falling back to "Решить позже". */
export function matchGroup<T extends { id: string; name: string }>(groups: T[], suggested: string | null | undefined): T | undefined {
  const s = (suggested ?? "").trim().toLowerCase();
  const exact = groups.find((g) => g.name.toLowerCase() === s);
  if (exact) return exact;
  const partial = s ? groups.find((g) => g.name.toLowerCase().includes(s) || s.includes(g.name.toLowerCase())) : undefined;
  return partial ?? groups.find((g) => g.name.toLowerCase().includes("позже"));
}
