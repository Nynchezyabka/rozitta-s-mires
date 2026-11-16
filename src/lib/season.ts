import { useEffect, useState } from "react";

/** Auto: 15 Dec – 14 Jan. */
export function isXmasDate(d = new Date()) {
  const m = d.getMonth(), day = d.getDate();
  return (m === 11 && day >= 15) || (m === 0 && day <= 14);
}
export function useXmas() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const check = () => setOn(isXmasDate());
    check();
    const timer = setInterval(check, 60_000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  return { on };
}
