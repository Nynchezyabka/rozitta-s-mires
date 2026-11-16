import { createFileRoute, redirect } from "@tanstack/react-router";

/** Short address printed in sticker QR codes: /b/<id> → /box/<id>. */
export const Route = createFileRoute("/b/$id")({
  beforeLoad: ({ params }) => { throw redirect({ to: "/box/$id", params: { id: params.id } }); },
  head: () => ({ meta: [{ title: "Сундук · Топи Розитты" }, { name: "description", content: "Переход к сундуку по наклейке." }, { property: "og:title", content: "Сундук · Топи Розитты" }, { property: "og:description", content: "Переход к сундуку по наклейке." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});
