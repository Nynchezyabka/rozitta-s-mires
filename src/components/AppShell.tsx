import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Home, Plus, Tags, Printer, Users, Timer } from "lucide-react";
import { useHousehold } from "@/lib/household";
import { Welcome } from "./Welcome";

function SessionTimer() {
  const [end, setEnd] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const s = localStorage.getItem("korobki-timer");
    if (s) setEnd(Number(s));
  }, []);
  useEffect(() => {
    if (!end) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [end]);
  const left = end ? Math.max(0, end - now) : 0;
  useEffect(() => {
    if (end && left === 0) {
      localStorage.removeItem("korobki-timer");
      setEnd(null);
      if ("vibrate" in navigator) navigator.vibrate?.(300);
      alert("Сессия окончена. Отличная работа — сделайте перерыв!");
    }
  }, [end, left]);
  const start = (min: number) => {
    const e = Date.now() + min * 60000;
    localStorage.setItem("korobki-timer", String(e));
    setNow(Date.now());
    setEnd(e);
  };
  if (!end)
    return (
      <div className="flex items-center gap-1 text-sm">
        <Timer className="h-4 w-4 text-muted-foreground" />
        {[15, 25].map((m) => (
          <button key={m} onClick={() => start(m)} className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-secondary-foreground">
            {m} мин
          </button>
        ))}
      </div>
    );
  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000).toString().padStart(2, "0");
  return (
    <button
      onClick={() => {
        localStorage.removeItem("korobki-timer");
        setEnd(null);
      }}
      className="rounded-full bg-primary px-3 py-1 font-display text-sm text-primary-foreground tabular-nums"
      title="Остановить"
    >
      ⏱ {mm}:{ss}
    </button>
  );
}

const nav = [
  { to: "/", label: "Коробки", icon: Home },
  { to: "/new", label: "Новая", icon: Plus },
  { to: "/groups", label: "Группы", icon: Tags },
  { to: "/stickers", label: "Наклейки", icon: Printer },
  { to: "/family", label: "Семья", icon: Users },
] as const;

export function AppShell({ children }: { children: (d: NonNullable<ReturnType<typeof useHousehold>["data"]>, token: string) => ReactNode }) {
  const { token, data, isLoading, error } = useHousehold();
  if (token === undefined) return <div className="min-h-screen" />;
  if (!token) return <Welcome />;
  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-28">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-background/90 px-4 py-3 backdrop-blur">
        <Link to="/" className="font-display text-lg font-bold">
          📦 {data?.household.name ?? "Коробки"}
        </Link>
        <SessionTimer />
      </header>
      <main className="px-4">
        {isLoading && <p className="py-10 text-center text-muted-foreground">Загружаю…</p>}
        {error && <p className="py-10 text-center text-destructive">{(error as Error).message}</p>}
        {data && children(data, token)}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-card">
        <div className="mx-auto flex max-w-2xl justify-around py-2">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              className="flex flex-col items-center gap-0.5 px-2 py-1 text-xs text-muted-foreground"
              activeProps={{ className: "text-primary font-semibold" }}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
