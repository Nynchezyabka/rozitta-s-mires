import { describe, expect, it } from "vitest";
import { boxContents, extendDecision, findBoxHouse } from "./box-actions";

describe("box actions", () => {
  it("extends by three calendar months", () => expect(extendDecision(new Date(2026, 10, 26))).toBe("2027-02-26"));
  it("clamps month ends", () => expect(extendDecision(new Date(2026, 10, 30))).toBe("2027-02-28"));
  it("includes linked garments but no other chest's clothing", () => {
    expect(boxContents("a", [{ box_id: "a", name: "Книга" }], [{ box_id: "a", name: "Куртка", owner: "Малыш", size: "86" }, { box_id: "b", name: "Шарф", owner: "", size: "" }])).toEqual(["Книга", "Куртка · Малыш · 86"]);
  });
  it("finds a QR chest in another saved house despite an unavailable house", async () => {
    const result = await findBoxHouse("chest", ["broken", "flat", "dacha"], async (t) => {
      if (t === "broken") throw new Error("offline");
      return { household: { name: t }, boxes: t === "dacha" ? [{ id: "chest" }] : [] };
    });
    expect(result.match?.token).toBe("dacha");
  });
  it("does not invent access to an unknown house", async () => {
    expect((await findBoxHouse("missing", ["flat"], async () => ({ household: { name: "flat" }, boxes: [] }))).match).toBeNull();
  });
});