import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createHousehold } from "@/lib/store";
import { setToken } from "@/lib/household";
import rozitta from "@/assets/rozitta.png";
import cabbage from "@/assets/cabbage.png";
import { SwampDecor } from "./SwampDecor";

export function Welcome({ foreignBox = false }: { foreignBox?: boolean }) {
  const [name, setName] = useState("Наш дом");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const join = () => {
    const m = link.trim().match(/([a-f0-9]{36})/);
    if (m?.[1]) setToken(m[1]);
    else toast.error("🐸 Не похоже на ссылку-приглашение. Скопируйте ссылку целиком.");
  };
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6">
      <SwampDecor />
      <div className="relative z-[1]">
        <div className="relative w-fit">
          <img src={rozitta} alt="Розитта" className="pixel bob h-36 w-36" />
          <img src={cabbage} alt="" className="pixel absolute -right-10 bottom-0 h-14 w-14" />
          <img src={cabbage} alt="" className="pixel absolute -left-6 top-2 h-8 w-8" />
        </div>
        <h1 className="mt-4 font-display text-xl leading-relaxed text-primary">Тайные Хроники Топей Розитты</h1>
        <p className="mt-1 text-accent">Розитта, хранительница волшебных сундуков, к вашим услугам</p>
        <p className="mt-2 text-muted-foreground">Сфотографируйте сундук или полку — список вещей появится сам. Без почты и паролей.</p>
      </div>
      {foreignBox && (
        <div role="alert" className="relative z-[1] space-y-3 rounded-3xl border-2 border-primary bg-card/95 p-5">
          <p className="font-semibold">🐸 Это сундук из другого дома или другого браузера.</p>
          <p className="text-sm text-muted-foreground">Откройте приложение и отсканируйте наклейку кнопкой сканера.</p>
          <Button className="h-12 w-full" onClick={() => document.getElementById("invite-link")?.focus()}>Войти по ссылке-ключу</Button>
        </div>
      )}
      <div className="relative z-[1] space-y-3 rounded-3xl bg-card/90 backdrop-blur p-5 shadow-sm">
        <p className="font-semibold">Завести свой дом</p>
        <label htmlFor="house-name" className="block text-sm text-muted-foreground">Как назовём дом?</label>
        <Input id="house-name" value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-base" />
        <Button
          className="h-12 w-full text-base"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await createHousehold({ data: { name } });
              setToken(r.token);
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Завожу…" : "Завести"}
        </Button>
      </div>
      <div className="relative z-[1] space-y-3 rounded-3xl bg-secondary/80 backdrop-blur p-5">
        <p className="font-semibold">Меня пригласили</p>
        <p className="text-sm text-muted-foreground">Отсканируйте QR камерой телефона или вставьте ссылку:</p>
        <Input id="invite-link" placeholder="Ссылка-приглашение" value={link} onChange={(e) => setLink(e.target.value)} className="h-12" />
        <Button variant="outline" className="h-12 w-full" onClick={join}>
          Войти по ссылке
        </Button>
      </div>
    </div>
  );
}
