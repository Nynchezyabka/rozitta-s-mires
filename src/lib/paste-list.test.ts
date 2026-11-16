import { describe, expect, it } from "vitest";
import { parsePasted } from "./paste-list";

describe("parsePasted", () => {
  it("one non-empty line = one item, markers and numbering stripped", () => {
    const r = parsePasted("1. Полотенца, 4 шт\n\n- Фен\n• Утюг\n* Плед\n2) Лампа  настольная", "box");
    expect(r.items.map((i) => i.name)).toEqual(["Полотенца, 4 шт", "Фен", "Утюг", "Плед", "Лампа настольная"]);
  });
  it("books split into title and author by dash", () => {
    const r = parsePasted("Лоскутик и облако — Софья Прокофьева\nМастер и Маргарита - Булгаков\nБез автора", "books");
    expect(r.items).toEqual([
      { name: "Лоскутик и облако", author: "Софья Прокофьева" },
      { name: "Мастер и Маргарита", author: "Булгаков" },
      { name: "Без автора", author: null },
    ]);
  });
  it("keeps duplicates but reports them", () => {
    const r = parsePasted("Фен\nфен", "box");
    expect(r.items).toHaveLength(2);
    expect(r.duplicates).toEqual(["фен"]);
  });
});
