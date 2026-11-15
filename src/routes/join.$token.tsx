import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { setToken } from "@/lib/household";

export const Route = createFileRoute("/join/$token")({
  head: () => ({
    meta: [
      { title: "Приглашение — Коробки" },
      { name: "description", content: "Вас пригласили в общий список коробок семьи." },
      { property: "og:title", content: "Приглашение в Коробки" },
      { property: "og:description", content: "Вас пригласили в общий список коробок семьи." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Join,
});

function Join() {
  const { token } = Route.useParams();
  const nav = useNavigate();
  useEffect(() => {
    setToken(token);
    nav({ to: "/", replace: true });
  }, [token, nav]);
  return <p className="py-20 text-center">Открываю коробки…</p>;
}
