import { describe, expect, it } from "vitest";
import { suggestIcons } from "./icons";

describe("suggestIcons", () => {
  it("fittings and nuts → bolt", () => expect(suggestIcons("Фитинги и гайки")[0]).toBe("🔩"));
  it("snowboard", () => expect(suggestIcons("Сноуборды")).toContain("🏂"));
  it("leashes", () => expect(suggestIcons("Поводки")).toContain("🦮"));
  it("3D printer", () => expect(suggestIcons("Для 3D принтера")).toContain("🖨️"));
  it("plane models", () => expect(suggestIcons("Модели самолётиков")).toContain("✈️"));
  it("fertilizers", () => expect(suggestIcons("Удобрения")).toContain("🌱"));
  it("paints", () => expect(suggestIcons("Краски и творчество")[0]).toBe("🎨"));
  it("cat urn", () => expect(suggestIcons("Урна с прахом кошки")).toContain("🕯️"));
  it("nothing for nonsense", () => expect(suggestIcons("ыыы")).toEqual([]));
});
