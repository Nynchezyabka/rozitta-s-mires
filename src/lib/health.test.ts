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
  it("при беременности зелёная метка требует уточнить у врача", () => {
    const p = medsPrompt({ flags: ["pregnant"], notes: "" }, true);
    expect(p).toContain("🟢 нет известных запретов, уточните у врача или фармацевта");
    expect(p).not.toContain("обычно можно");
  });
  it("срок годности — проверить по упаковке", () => {
    expect(medsPrompt({ flags: [], notes: "" }, true)).toContain("проверьте по упаковке");
  });
});
