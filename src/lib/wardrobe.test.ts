import { describe, expect, it } from "vitest";
import { currentSeason, pickOutfit, sizeMatches, clothDestination, selectedClothes, matchesCloth } from "./wardrobe";

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
  it("taking a garment out clears its chest and sets closet status", () => {
    expect(clothDestination("stored", null)).toEqual({ box_id: null, status: "closet" });
  });
  it("putting a wearable garment into a chest sets storage status", () => {
    expect(clothDestination("closet", "chest-5")).toEqual({ box_id: "chest-5", status: "stored" });
  });
  it("moving a hand-me-down to another chest keeps its purpose", () => {
    expect(clothDestination("grow", "chest-6")).toEqual({ box_id: "chest-6", status: "grow" });
  });
  it("an outfit references existing garments without duplicates", () => {
    expect(selectedClothes([{ id: "shirt" }, { id: "trousers" }], ["shirt", "shirt", "deleted"]).map((c) => c.id)).toEqual(["shirt"]);
  });
  it("home search matches garment category and color, including е instead of ё", () => {
    const garment = { name: "Брюки", category: "Спорт", color: "чёрный", owner: "Муж", size: "M" };
    expect(matchesCloth(garment, "черный спорт")).toBe(true);
    expect(matchesCloth(garment, "красный спорт")).toBe(false);
  });
});
