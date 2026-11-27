import { describe, expect, it } from "vitest";
import { inRoom, roomByKey, roomForLocation, ROOMS } from "./rooms";

function room(key: string) {
  const value = roomByKey(key);
  if (!value) throw new Error(`Missing room: ${key}`);
  return value;
}

const boxes = [{ location: "Стеллаж с винилом в гостиной" }, { location: "Гараж, верхняя полка" }, { location: "Под кроватью" }, { location: null }];
describe("rooms", () => {
  it("finds chests by place words", () => {
    expect(inRoom(room("music"), boxes)).toEqual([boxes[0]]);
    expect(inRoom(room("garage"), boxes)).toEqual([boxes[1]]);
  });
  it("puts unclaimed chests in «Всё остальное»", () => {
    expect(inRoom(room("other"), boxes)).toEqual([boxes[2], boxes[3]]);
  });
  it("assigns a pantry once, not to both wardrobe and kitchen", () => {
    const pantry = [{ location: "Кладовка, верхняя полка" }];
    expect(roomForLocation(pantry[0]?.location ?? null)?.key).toBe("wardrobe");
    expect(ROOMS.flatMap((r) => inRoom(r, pantry))).toEqual(pantry);
  });
  it("prefers the physical room over furniture or stored things", () => {
    expect(roomForLocation("Шкаф в детской")?.key).toBe("kids");
    expect(roomForLocation("Кухня, шкаф")?.key).toBe("kitchen");
    expect(roomForLocation("Спортивные вещи в гараже")?.key).toBe("garage");
  });
  it("uses the first physical room when a path names several", () => {
    expect(roomForLocation("Дача, кухня, шкаф")?.key).toBe("dacha");
  });
  it("does not mistake internal substrings for place names", () => {
    expect(roomForLocation("Бескнижный ящик")?.key).toBe("other");
  });
  it("partitions all chests without loss or duplication", () => {
    const list = [...boxes, { location: "Кладовка" }, { location: "Кухня, шкаф" }, { location: "Шкаф в детской" }];
    const assigned = ROOMS.flatMap((r) => inRoom(r, list));
    expect(assigned).toHaveLength(list.length);
    for (const box of list) expect(assigned.filter((b) => b === box)).toHaveLength(1);
  });
});
