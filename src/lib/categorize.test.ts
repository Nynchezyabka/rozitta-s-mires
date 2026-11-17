import { describe, expect, it } from "vitest";
import { parseCategories } from "./ai-key";

describe("parseCategories", () => {
  it("maps AI answer to item names, falling back to order", () => {
    const r = parseCategories('```json\n{"items":[{"name":"Трусы","category":"Одежда"},{"name":"???","category":"Декор"}]}\n```', ["Трусы", "Аромолампа"]);
    expect(r).toEqual({ Трусы: "Одежда", Аромолампа: "Декор" });
  });
});
