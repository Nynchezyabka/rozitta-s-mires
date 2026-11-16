import { describe, expect, it, beforeEach } from "vitest";
import { addBloom, bloomAt, BLOOMS, getGarden, nextTask } from "./coach";

describe("коуч и заводь", () => {
  beforeEach(() => localStorage.clear());
  it("первым распускается кувшинка", () => expect(bloomAt(0).id).toBe("lily"));
  it("цветы идут по кругу", () => expect(bloomAt(BLOOMS.length).id).toBe("lily"));
  it("сад только растёт", () => {
    addBloom(); addBloom();
    expect(getGarden()).toBe(2);
  });
  it("новая задача не повторяет предыдущую", () => {
    const a = nextTask("paws");
    for (let i = 0; i < 20; i++) expect(nextTask("paws", a)).not.toBe(a);
  });
});
