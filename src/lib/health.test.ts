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

import { healthCheckLine } from "./health";
describe("healthCheckLine", () => {
  it("is empty when the profile is empty", () => {
    expect(healthCheckLine({ flags: [], notes: "" })).toBe("");
  });
  it("asks to mark medicines when something is set", () => {
    const l = healthCheckLine({ flags: ["pregnant"], notes: "" });
    expect(l).toContain("беременность");
    expect(l).toContain("🔴");
  });
});
