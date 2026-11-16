import { describe, expect, it } from "vitest";
import { shouldRemindBackup } from "./updates";
import { parseBackup } from "./restore";
const D = 86400000, now = 100 * D;
describe("напоминание о копии", () => {
  it("молчит, если копия была меньше месяца назад", () => expect(shouldRemindBackup(now, now - 29 * D, 0, 5)).toBe(false));
  it("напоминает через 30 дней", () => expect(shouldRemindBackup(now, now - 30 * D, 0, 5)).toBe(true));
  it("не чаще раза в неделю", () => expect(shouldRemindBackup(now, null, now - 6 * D, 5)).toBe(false));
  it("молчит в пустом доме", () => expect(shouldRemindBackup(now, null, 0, 0)).toBe(false));
});
describe("чтение копии", () => {
  it("отвергает чужой файл", () => expect(() => parseBackup('{"a":1}')).toThrow("Это не копия"));
  it("читает свою копию", () => {
    const b = parseBackup(JSON.stringify({ app: "rozittas-mires", groups: [{ id: "g", name: "Зима", color: "#000", icon: "❄️" }], boxes: [{ id: "b", number: 1, group_id: "g" }], items: [{ box_id: "b", name: "Сапоги" }], notes: [] }));
    expect(b.groupNames["g"]).toBe("Зима");
    expect(b.items).toHaveLength(1);
  });
});
