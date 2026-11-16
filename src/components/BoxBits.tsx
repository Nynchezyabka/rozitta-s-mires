import { daysLeft, locationParts } from "@/lib/location";

export function LocationPath({ value, className = "" }: { value: string | null | undefined; className?: string }) {
  const parts = locationParts(value);
  if (!parts.length) return null;
  return (
    <p className={`flex flex-wrap items-center gap-1 text-xs text-accent ${className}`}>
      <span>📍</span>
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1">{i > 0 && <span className="opacity-60">→</span>}<span>{p}</span></span>
      ))}
    </p>
  );
}

export function DueBadge({ date }: { date: string | null | undefined }) {
  if (!date) return null;
  const n = daysLeft(date);
  const [text, cls] = n < 0 ? ["⌛ Срок прошёл", "bg-destructive text-destructive-foreground"] : n === 0 ? ["⌛ Сегодня", "bg-warning text-foreground"] : n <= 14 ? [`⌛ Осталось ${n} дн.`, "bg-warning/50 text-foreground"] : [`⌛ до ${date.split("-").reverse().join(".")}`, "bg-secondary text-secondary-foreground"];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{text}</span>;
}
