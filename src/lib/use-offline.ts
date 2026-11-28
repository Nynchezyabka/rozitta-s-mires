import { useEffect, useState, useSyncExternalStore } from "react";
import { offlineSavedAt, subscribeOffline } from "./offline-store";

export function useOffline(token: string) {
  const [disconnected, setDisconnected] = useState(false);
  const savedAt = useSyncExternalStore(subscribeOffline, () => offlineSavedAt(token), () => null);
  useEffect(() => {
    const update = () => setDisconnected(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  return { offline: disconnected || savedAt !== null, savedAt };
}