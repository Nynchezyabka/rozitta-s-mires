import { describe, expect, it } from "vitest";
import { GARDEN_PLANTS, gardenPlantings, gardenRewardAt, isPotagerOpen, potagerPlantings } from "./garden";

describe("ярусный таинственный сад", () => {
  it("сохраняет обе кувшинки в воде", () => {
    const lilies = GARDEN_PLANTS.filter((p) => p.id === "lily" || p.id === "lily2");
    expect(lilies.map((p) => [p.id, p.habitat, p.layer])).toEqual([
      ["lily", "pond", "water"], ["lily2", "pond", "water"],
    ]);
  });
  it("растит неоновые грибы вместе с цветами", () => {
    expect(gardenPlantings(9).map((p) => p.id)).toContain("mushroom");
    expect(gardenPlantings(9).map((p) => p.id)).toContain("peony");
  });
  it("разделяет каркас, папоротники и три заполняющих почвопокровника", () => {
    expect(GARDEN_PLANTS.find((p) => p.id === "dogwood")?.layer).toBe("structure");
    expect(GARDEN_PLANTS.filter((p) => p.id === "fern" || p.id === "copper-fern").map((p) => p.layer)).toEqual(["perennial", "perennial"]);
    expect(GARDEN_PLANTS.filter((p) => ["ajuga", "veronica", "moneywort"].includes(p.id)).map((p) => p.layer)).toEqual(["groundcover", "groundcover", "groundcover"]);
  });
  it("не удаляет прежние растения после наград следующего круга", () => {
    const full = gardenPlantings(16);
    const later = gardenPlantings(33);
    expect(later.map((p) => p.id)).toEqual(full.map((p) => p.id));
    expect(later.find((p) => p.id === "lily")?.earned).toBe(3);
  });
  it("сохраняет первые восемь наград прежнего сада", () => {
    expect(Array.from({ length: 8 }, (_, i) => gardenRewardAt(i).id)).toEqual([
      "lily", "kiwi", "romanesco", "eryngium", "veggie", "chrysanthemum", "lily2", "peony",
    ]);
  });
  it("огород потаже открывается на 16-м шаге в пруду", () => {
    expect(isPotagerOpen(15)).toBe(false);
    expect(isPotagerOpen(16)).toBe(true);
  });
  it("первый шаг в огороде сажает романеско", () => {
    expect(potagerPlantings(0)).toEqual([]);
    expect(potagerPlantings(1).map((p) => p.id)).toEqual(["p-romanesco"]);
  });
});
