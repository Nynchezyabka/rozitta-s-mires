import { describe, expect, it } from "vitest";
import { inRoom, roomByKey } from "./rooms";

const boxes = [{ location: "Стеллаж с винилом в гостиной" }, { location: "Гараж, верхняя полка" }, { location: "Под кроватью" }, { location: null }];
describe("rooms", () => {
  it("finds chests by place words", () => {
    expect(inRoom(roomByKey("music")!, boxes)).toEqual([boxes[0]]);
    expect(inRoom(roomByKey("garage")!, boxes)).toEqual([boxes[1]]);
  });
  it("puts unclaimed chests in «Всё остальное»", () => {
    expect(inRoom(roomByKey("other")!, boxes)).toEqual([boxes[2], boxes[3]]);
  });
});
