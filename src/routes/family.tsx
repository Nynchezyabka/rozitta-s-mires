import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setToken, type HouseholdData } from "@/lib/household";
import { renameHousehold } from "@/lib/store";

export const Route = createFileRoute("/family")({
  head: () => ({
    meta: [
      { title: "Семья — Коробки" },
      { name: "description", content: "Пригласите родных по ссылке или QR-коду — без почты и паролей." },
      { property: "og:title", content: "Семья — Коробки" },
      { property: "og:description", content: "Пригласите родных по ссылке или QR-коду." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AppShell>{(d, t) => <Family d={d} token={t} />}</AppShell>,
});

function Family({ d, token }: { d: HouseholdData; token: string }) {
  const qc = useQueryClient();
  const [qr, setQr] = useState("");
  const [name, setName] = useState(d.household.name);
  const link = typeof window !== "undefined" ? `${location.origin}/join/${token}` : "";
  useEffect(() => {
    QRCode.toDataURL(link, { width: 480, margin: 1 }).then(setQr);
  }, [link]);
  return (
    <div className="space-y-5 pt-2">
      <h1 className="font-display text-2xl font-bold">Семья</h1>
      <div className="space-y-3 rounded-3xl bg-card p-5 text-center">
        <p className="font-semibold">Наведите камеру телефона на код</p>
        {qr && <img src={qr} alt="QR-код приглашения" className="mx-auto w-56 rounded-xl" />}
        <p className="text-sm text-muted-foreground">Каждый, у кого есть этот код или ссылка, видит и меняет все коробки. Не публикуйте его.</p>
        <Button
          variant="outline"
          className="h-12 w-full"
          onClick={async () => {
            if (navigator.share) await navigator.share({ title: "Наши коробки", url: link }).catch(() => {});
            else {
              await navigator.clipboard.writeText(link);
              toast.success("Ссылка скопирована");
            }
          }}
        >
          Отправить ссылку
        </Button>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Название дома</p>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-12" />
          <Button
            className="h-12"
            onClick={async () => {
              await renameHousehold({ data: { token, name } });
              qc.invalidateQueries({ queryKey: ["household", token] });
              toast.success("Готово");
            }}
          >
            ОК
          </Button>
        </div>
      </div>
      <button className="w-full py-2 text-sm text-muted-foreground underline" onClick={() => confirm("Выйти на этом устройстве? Вернуться можно по ссылке.") && setToken(null)}>
        Выйти на этом устройстве
      </button>
    </div>
  );
}
