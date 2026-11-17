import { describe, expect, it } from "vitest";
import { toCsv, toJson } from "./backup";
import type { HouseholdData } from "./store";

const d: HouseholdData = {
  household: { id: "h", name: "Дом" },
  groups: [{ id: "g1", name: "Кухня", color: "#fff", icon: "🧪", position: 0 }],
  boxes: [{ id: "b1", number: 5, group_id: "g1", photo_path: null, photo_url: "https://x", photo_paths: [], photo_urls: [], note: null, decide_by: null, kid_size: null, kid_season: null, location: "Балкон", created_at: "" }],
  notes: [{ id: "n", title: "t", body: "b", updated_at: "" }],
  items: [
    { id: "i1", box_id: "b1", name: "Чашки, 4 шт", kind: "item", author: null, needs_review: false, category: null },
    { id: "i2", box_id: "b1", name: "Лоскутик и облако", kind: "book", author: "Прокофьева", needs_review: false, category: null },
  ],
};

describe("backup", () => {
  it("CSV has one row per item with box number, group, location, name, author", () => {
    const lines = toCsv(d).replace("\uFEFF", "").split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('5,Кухня,Балкон,"Чашки, 4 шт",,');
    expect(lines[2]).toBe("5,Кухня,Балкон,Лоскутик и облако,Прокофьева,");
  });
  it("JSON contains boxes, items, groups and notes without temporary photo links", () => {
    const j = JSON.parse(toJson(d));
    expect(j.boxes[0].photo_url).toBeUndefined();
    expect(j.items).toHaveLength(2);
    expect(j.groups).toHaveLength(1);
    expect(j.notes).toHaveLength(1);
  });
});
