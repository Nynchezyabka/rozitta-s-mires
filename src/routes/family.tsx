import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { setToken, type HouseholdData } from "@/lib/household";

export const Route = createFileRoute("/family")({
  head: () => ({
    meta: [
      { title: "Семья · Топи Розитты" },
      { name: "description", content: "Пригласите родных по ссылке или QR-коду — без почты и паролей." },
      { property: "og:title", content: "Семья · Топи Розитты" },
      { property: "og:description", content: "Пригласите родных по ссылке или QR-коду." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AppShell>{(d, t) => <Family d={d} token={t} />}</AppShell>,
});

function Family({ token }: { d: HouseholdData; token: string }) {
  const [qr, setQr] = useState("");
  const link = typeof window !== "undefined" ? `${location.origin}/join/${token}` : "";
  useEffect(() => {
    QRCode.toDataURL(link, { width: 480, margin: 1 }).then(setQr);
  }, [link]);
  return (
    <div className="space-y-5 pt-2">
      <h1 className="font-display text-2xl font-bold">Подключить телефон</h1>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>На втором телефоне откройте камеру.</li>
        <li>Наведите её на этот код и откройте ссылку.</li>
        <li>Готово — там тот же дом, сундуки общие.</li>
      </ol>
      <div className="space-y-3 rounded-3xl bg-card p-5 text-center">
        <p className="font-semibold">Наведите камеру телефона на код</p>
        {qr && <img src={qr} alt="QR-код приглашения" className="mx-auto w-64 rounded-xl bg-white p-2 sm:w-72" />}
        <p className="text-sm text-muted-foreground">Каждый, у кого есть этот код или ссылка, видит и меняет все сундуки. Не публикуйте его.</p>
        <Button
          variant="outline"
          className="h-12 w-full"
          onClick={async () => {
            if (navigator.share) await navigator.share({ title: "Наши сундуки", url: link }).catch(() => {});
            else {
              await navigator.clipboard.writeText(link);
              toast.success("Ссылка скопирована");
            }
          }}
        >
          Отправить ссылку
        </Button>
        <Button variant="ghost" className="w-full" onClick={async () => { await navigator.clipboard.writeText(link); toast.success("Ссылка скопирована"); }}>Скопировать ссылку</Button>
      </div>
      <button className="w-full py-2 text-sm text-muted-foreground underline" onClick={() => toast("Выйти на этом устройстве? Вернуться можно по ссылке-ключу.", { action: { label: "Выйти", onClick: () => setToken(null) }, cancel: { label: "Остаться", onClick: () => {} } })}>
        Выйти на этом устройстве
      </button>
    </div>
  );
}
