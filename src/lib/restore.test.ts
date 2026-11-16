import { describe, expect, it } from "vitest";
import { planRestore, type Backup } from "./restore";

const box = (id: string, number: number) => ({ id, number, group_id: null, note: null, decide_by: null, kid_size: null, kid_season: null, location: null });
const backup: Backup = { groups: [], groupNames: {}, items: [], notes: [{ title: "Т", body: "Б" }], boxes: [box("a", 1), box("b", 2)] };
const cur = (boxes: { id: string; number: number }[], notes: { title: string; body: string }[] = []) => ({ boxes, notes }) as never;

describe("восстановление из копии", () => {
  it("в пустой дом возвращает все сундуки с их номерами", () => {
    const p = planRestore(cur([]), backup);
    expect(p.add.map((b) => [b.id, b.number])).toEqual([["a", 1], ["b", 2]]);
    expect(p.conflicts).toEqual([]);
  });
  it("повторное восстановление той же копии ничего не добавляет", () => {
    const p = planRestore(cur([{ id: "a", number: 1 }, { id: "b", number: 2 }], [{ title: "Т", body: "Б" }]), backup);
    expect(p.add).toEqual([]);
    expect(p.notes).toEqual([]);
    expect(p.same).toBe(2);
  });
  it("номер, занятый другим сундуком, — конфликт до начала", () => {
    expect(planRestore(cur([{ id: "x", number: 2 }]), backup).conflicts).toEqual([2]);
  });
});
