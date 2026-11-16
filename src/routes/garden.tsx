import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SecretGarden } from "@/components/SecretGarden";

export const Route = createFileRoute("/garden")({
  head: () => ({ meta: [
    { title: "Таинственный сад · Топи Розитты" },
    { name: "description", content: "За дверью с плющом растёт сад Розитты: кувшинки, папоротники, неоновые грибы и маленькие дела без спешки." },
    { property: "og:title", content: "Таинственный сад · Топи Розитты" },
    { property: "og:description", content: "Тихий пиксельный сад с ярусными посадками и бережным коучем Розиттой." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <AppShell>{() => <SecretGarden />}</AppShell>,
});