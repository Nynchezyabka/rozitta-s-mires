import { describe, it, expect } from "vitest";
import { matchesAll } from "./search";
import { byFrequency } from "@/components/BoxParts";
describe("search", () => {
  it("ё equals е", () => expect(matchesAll("Ёлочные игрушки", "елочные")).toBe(true));
  it("all words must match", () => { expect(matchesAll("Зарядка для телефона", "телефон зарядка")).toBe(true); expect(matchesAll("Зарядка", "зарядка кабель")).toBe(false); });
  it("rough stem", () => expect(matchesAll("Зарядное устройство", "зарядка")).toBe(true));
});
describe("places", () => {
  it("most used first", () => expect(byFrequency(["Антресоль", "Шкаф", "Шкаф", null])[0]).toBe("Шкаф"));
});
