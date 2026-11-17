import { describe, expect, it } from "vitest";
import { autoTagColor, normTag, tagCounts, TAG_COLORS } from "./tags";

describe("tags", () => {
  it("normalises spelling", () => {
    expect(normTag("  электроника  и провода ")).toBe("Электроника и провода");
    expect(normTag("")).toBeNull();
  });
  it("gives the same palette colour for the same tag", () => {
    expect(autoTagColor("Аквариум")).toBe(autoTagColor("аквариум"));
    expect(TAG_COLORS).toContain(autoTagColor("Аквариум"));
  });
  it("counts things per tag, most first, merging case", () => {
    expect(tagCounts([{ category: "Кухня" }, { category: "кухня" }, { category: "Аквариум" }, { category: null }]))
      .toEqual([{ tag: "Кухня", count: 2 }, { tag: "Аквариум", count: 1 }]);
  });
});
