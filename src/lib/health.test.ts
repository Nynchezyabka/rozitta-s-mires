import { describe, expect, it } from "vitest";
import { healthContext, medsPrompt } from "./health";

describe("аптечка", () => {
  it("без профиля не просит меток совместимости", () => {
    expect(medsPrompt({ flags: [], notes: "" }, true)).not.toContain("🔴");
  });
  it("беременность и личные противопоказания попадают в запрос", () => {
    const h = { flags: ["pregnant" as const], notes: "аллергия на пенициллин" };
    expect(healthContext(h)).toBe("беременность; личные противопоказания: аллергия на пенициллин");
    expect(medsPrompt(h, false)).toContain("🔴");
  });
});
