import { describe, expect, it } from "vitest";
import { findHomeNotes, findQuickNotes } from "./note-search";

describe("note search", () => {
  it("finds saved quick notes and links old spaces to current rooms", () => {
    const result = findQuickNotes([{ id: "a", title: "Запасные ключи", space: "wardrobe" }], "ключ");
    expect(result.map((r) => [r.note.id, r.room.key])).toEqual([["a", "wardrobe"]]);
  });
  it("finds notes in the home space", () => {
    expect(findQuickNotes([{ id: "b", title: "Ёлочные игрушки", space: "home" }], "елочные").map((r) => r.room.key)).toEqual(["other"]);
  });
  it("searches both title and body of household notes", () => {
    const notes = [{ id: "c", title: "Запасы", body: "Ключ от дачи на полке" }];
    expect(findHomeNotes(notes, "ключ дачи")).toEqual(notes);
    expect(findHomeNotes(notes, "выключатель")).toEqual([]);
  });
  it("does not show all notes before a query is entered", () => {
    expect(findQuickNotes([{ id: "a", title: "Ключ", space: "home" }], "")).toEqual([]);
    expect(findHomeNotes([{ id: "b", title: "Ключ", body: "" }], " ")).toEqual([]);
  });
});