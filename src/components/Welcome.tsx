import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createHousehold } from "@/lib/store";
import { setToken } from "@/lib/household";

export function Welcome() {
  const [name, setName] = useState("Наш дом");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const join = () => {
    const m = link.trim().match(/([a-f0-9]{36})/);
    if (m?.[1]) setToken(m[1]);
    else alert("Не похоже на ссылку-приглашение");
  };
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6">
      <div>
        <div className="text-6xl">🐸</div>
        <h1 className="mt-4 font-display text-3xl font-bold leading-tight">Коробки без хаоса</h1>
        <p className="mt-2 text-muted-foreground">Сфотографируйте коробку — список вещей появится сам. Без почты и паролей.</p>
      </div>
      <div className="space-y-3 rounded-3xl bg-card p-5 shadow-sm">
        <p className="font-semibold">Начать новый дом</p>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-base" />
        <Button
          className="h-12 w-full text-base"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await createHousehold({ data: { name } });
              setToken(r.token);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Создаю…" : "Создать"}
        </Button>
      </div>
      <div className="space-y-3 rounded-3xl bg-secondary/60 p-5">
        <p className="font-semibold">Меня пригласили</p>
        <p className="text-sm text-muted-foreground">Отсканируйте QR камерой телефона или вставьте ссылку:</p>
        <Input placeholder="Ссылка-приглашение" value={link} onChange={(e) => setLink(e.target.value)} className="h-12" />
        <Button variant="outline" className="h-12 w-full" onClick={join}>
          Войти
        </Button>
      </div>
    </div>
  );
}
