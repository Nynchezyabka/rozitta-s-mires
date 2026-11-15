export function GroupChip({ g }: { g?: { name: string; color: string; icon: string } | null }) {
  if (!g) return <span className="text-sm text-muted-foreground">Без группы</span>;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-medium" style={{ backgroundColor: g.color + "33" }}>
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
      {g.icon} {g.name}
    </span>
  );
}
