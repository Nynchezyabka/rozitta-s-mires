import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useEffect, useState, type ReactNode } from "react";
import { Home, Plus, Tags, Printer, Users, Hourglass, Settings, BookOpen, HelpCircle, Menu, Sprout, Save } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useXmas, setXmasMode } from "@/lib/season";
import { useHousehold } from "@/lib/household";
import { Welcome } from "./Welcome";
import rozitta from "@/assets/rozitta.png";
import gardenKey from "@/assets/garden-key.png";
import { SwampDecor } from "./SwampDecor";
import { QrScanner } from "./QrScanner";
import { sfx, soundOn, setSound } from "@/lib/rozitta";
import { APP_VERSION, initUpdates } from "@/lib/updates";

function SessionTimer() {
  const [end, setEnd] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [open, setOpen] = useState(false);
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
      const msg = "🐸 Розитта: зелье сварено! Время пить чай и отдыхать.";
      if (document.hidden && "Notification" in window && Notification.permission === "granted") new Notification("Топи Розитты", { body: msg, icon: "/icon-192.png" });
      toast.success(msg, { duration: 15000 });
    }
  }, [end, left]);
  const start = (min: number) => {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
    const e = Date.now() + min * 60000;
    localStorage.setItem("korobki-timer", String(e));
    setNow(Date.now());
    setEnd(e);
    setOpen(false);
  };
  const stop = () => { localStorage.removeItem("korobki-timer"); setEnd(null); setOpen(false); };
  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000).toString().padStart(2, "0");
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {end ? (
          <button className="shrink-0 rounded-full bg-primary px-3 py-2 font-display text-[10px] leading-none text-primary-foreground tabular-nums shadow-[0_0_12px_var(--primary)]" aria-label="Таймер уборки идёт">
            ⏳ {mm}:{ss}
          </button>
        ) : (
          <button aria-label="Таймер уборки" className="shrink-0 rounded-full bg-secondary p-2 text-secondary-foreground"><Hourglass className="h-4 w-4" /></button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="z-50 w-64 space-y-3 border-2 border-primary/60 bg-card">
        <p className="font-display text-[11px] leading-relaxed text-primary">Зелье-таймер</p>
        {end ? (
          <>
            <p className="text-sm">Варится ещё {mm}:{ss}. Потом Розитта позовёт пить чай.</p>
            <Button variant="secondary" className="w-full" onClick={stop}>Остановить</Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Короткий забег по уборке. Когда время выйдет — отдыхаешь, даже если не доделала.</p>
            <div className="grid grid-cols-3 gap-2">
              {[5, 15, 25].map((m) => <Button key={m} onClick={() => start(m)}>{m} мин</Button>)}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function MoreMenu() {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(soundOn()), []);
  const { mode } = useXmas();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button aria-label="Меню" className="shrink-0 rounded-full bg-secondary p-2 text-secondary-foreground"><Menu className="h-4 w-4" /></button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-50 w-60 border-2 border-primary/60 bg-card">
        <DropdownMenuItem asChild><Link to="/garden"><img src={gardenKey} alt="" width={816} height={816} className="pixel mr-2 h-6 w-6" />Таинственный сад</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/family"><Users className="mr-2 h-4 w-4" />Хранители ключей</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/backup"><Save className="mr-2 h-4 w-4" />Копия и обновления</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/help"><HelpCircle className="mr-2 h-4 w-4" />Справка</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/settings"><Settings className="mr-2 h-4 w-4" />Ключ нейросети</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSound(!on); setOn(!on); if (!on) sfx.quack(); }}>
          {on ? "🔊 Звуки включены" : "🔇 Звуки выключены"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setXmasMode(mode === "auto" ? "on" : mode === "on" ? "off" : "auto"); }}>
          🎄 Новый год: {mode === "auto" ? "сам с 15 декабря" : mode === "on" ? "включён" : "выключен"}
        </DropdownMenuItem>
        <p className="px-2 pb-1 pt-2 text-right text-[10px] text-muted-foreground">версия {APP_VERSION}</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const nav = [
  { to: "/", label: "Сундуки", icon: Home },
  { to: "/new", label: "Собрать", icon: Plus },
  { to: "/groups", label: "Группы", icon: Tags },
  { to: "/house", label: "Дом", icon: Sprout },
  { to: "/grimoire", label: "Гримуар", icon: BookOpen },
  { to: "/stickers", label: "Наклейки", icon: Printer },
  
] as const;

export function AppShell({ children, garden = false }: { children: (d: NonNullable<ReturnType<typeof useHousehold>["data"]>, token: string) => ReactNode; garden?: boolean }) {
  const { token, data, isLoading, error } = useHousehold();
  const boxes = data?.boxes.length;
  useEffect(() => { if (boxes !== undefined) initUpdates(boxes); }, [boxes]);
  if (token === undefined) return <div className="min-h-screen" />;
  if (!token) return <Welcome foreignBox={window.location.pathname.startsWith("/box/")} />;
  return (
    <div className={`mx-auto min-h-screen max-w-2xl pb-28 ${garden ? "garden-shell" : ""}`}>
      <header className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 bg-background/90 px-4 py-2 backdrop-blur">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <img src={rozitta} alt="Розитта" className="pixel bob h-10 w-10 shrink-0" />
          <span className="flex min-w-0 flex-col leading-tight"><span className="truncate font-display text-[11px] text-primary">Топи Розитты</span>{data?.household.name && <span className="truncate text-[11px] text-muted-foreground">{data.household.name}</span>}</span>
        </Link>
        <div className="flex items-center gap-2">
          <QrScanner />
          <SessionTimer />
          <MoreMenu />
        </div>
      </header>
      <main className="relative z-[1] px-4">
        {isLoading && <p className="py-10 text-center text-muted-foreground">Загружаю…</p>}
        {error && <p className="py-10 text-center text-destructive">{(error as Error).message}</p>}
        {data && children(data, token)}
      </main>
      {!garden && <SwampDecor />}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-card rounded-t-3xl border-t-2 border-primary/60 shadow-[0_-6px_24px_-6px_var(--primary)]">
        <div className="mx-auto flex max-w-2xl justify-around py-2">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              className="flex flex-col items-center gap-0.5 px-1 py-1 text-[11px] text-muted-foreground"
              activeProps={{ className: "text-primary font-semibold drop-shadow-[0_0_6px_var(--primary)]" }}
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
