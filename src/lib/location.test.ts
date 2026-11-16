import { describe, expect, it } from "vitest";
import { daysLeft, locationParts } from "./location";
describe("location", () => {
  it("splits by slash and arrows", () => expect(locationParts("Спальня / Шкаф → Полка 3")).toEqual(["Спальня", "Шкаф", "Полка 3"]));
  it("days left", () => {
    expect(daysLeft("2026-11-21", new Date(2026, 10, 16))).toBe(5);
    expect(daysLeft("2026-11-15", new Date(2026, 10, 16))).toBe(-1);
  });
});
