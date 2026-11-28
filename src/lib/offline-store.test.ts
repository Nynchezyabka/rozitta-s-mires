import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import { readOffline, clearOfflineHouse, offlineSavedAt, assertOnline } from "./offline-store";

describe("offline snapshots", () => {
  it("reads the last successful inventory on transport failure", async () => {
    await readOffline("test-a", "k_get", async () => ({ items: ["Ключ"] }));
    expect(await readOffline("test-a", "k_get", async () => { throw new TypeError("Failed to fetch"); })).toEqual({ items: ["Ключ"] });
    expect(offlineSavedAt("test-a")).toBeTypeOf("number");
    await clearOfflineHouse("test-a");
  });
  it("does not mix houses or silently invent an empty inventory", async () => {
    await readOffline("test-b", "k_get", async () => ["Плед"]);
    await expect(readOffline("test-c", "k_get", async () => { throw new TypeError("Failed to fetch"); })).rejects.toThrow("копии");
    await clearOfflineHouse("test-b");
  });
  it("does not fall back on denied access and removes the old copy", async () => {
    await readOffline("test-d", "k_get", async () => ["Ключ"]);
    await expect(readOffline("test-d", "k_get", async () => { throw new Error("Дом не найден"); })).rejects.toThrow("Дом не найден");
    await expect(readOffline("test-d", "k_get", async () => { throw new TypeError("Failed to fetch"); })).rejects.toThrow("копии");
  });
  it("rejects writes offline rather than reporting saved or queuing a stale overwrite", () => {
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    expect(assertOnline).toThrow("ничего не сохранено");
    online.mockRestore();
  });
});