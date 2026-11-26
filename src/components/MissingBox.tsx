import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getHouses, householdQuery, setToken } from "@/lib/household";
import { findBoxHouse } from "@/lib/box-actions";

export function MissingBox({ id, token }: { id: string; token: string }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState("Ищу сундук в сохранённых домах…");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setStatus("Ищу сундук в сохранённых домах…");
    findBoxHouse(id, getHouses().filter((t) => t !== token), (t) => qc.fetchQuery({ ...householdQuery(t), staleTime: 0 })).then(({ match, failed }) => {
      if (!active) return;
      if (match) {
        setToken(match.token);
        toast.success(`Открыт дом «${match.data.household.name}»`);
      } else setStatus(failed ? "Не все дома удалось проверить — проверьте интернет и повторите." : "Сундук не найден в сохранённых домах. Возможно, он удалён или нужно подключить другой дом по семейной ссылке.");
    });
    return () => { active = false; };
  }, [id, token, qc, attempt]);
  return <div className="space-y-4 py-10 text-center"><p className="text-muted-foreground">{status}</p><Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>Повторить поиск</Button><p><Link to="/trash" className="text-primary underline">Проверить корзину этого дома</Link></p></div>;
}