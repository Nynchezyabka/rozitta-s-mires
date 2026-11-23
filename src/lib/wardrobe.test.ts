import { describe, expect, it } from "vitest";
import { currentSeason, pickOutfit, sizeMatches } from "./wardrobe";

const c = (id: string, layer: string, o: Partial<{ owner: string; season: string; status: string }> = {}) =>
  ({ id, layer, owner: o.owner ?? "Муж", season: o.season ?? "all", status: o.status ?? "closet" });

describe("wardrobe", () => {
  it("height 86 matches size 80-86 but not 104", () => {
    expect(sizeMatches("80-86", "86")).toBe(true);
    expect(sizeMatches("104", "86")).toBe(false);
  });
  it("outfit only uses this person's closet things for the season", () => {
    const all = [c("t", "top"), c("b", "bottom"), c("x", "top", { owner: "Наталия" }), c("w", "bottom", { season: "winter" }), c("s", "shoes", { status: "stored" })];
    const ids = pickOutfit(all, "Муж", "summer", () => 0).map((x) => x.id).sort();
    expect(ids).toEqual(["b", "t"]);
  });
  it("December is winter", () => {
    expect(currentSeason(new Date(2026, 11, 20))).toBe("winter");
  });
});
