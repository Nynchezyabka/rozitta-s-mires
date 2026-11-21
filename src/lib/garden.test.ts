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

import { isNightHour } from "./garden";
describe("night by clock", () => {
  it("night 21:00–06:00", () => {
    expect(isNightHour(21)).toBe(true);
    expect(isNightHour(5)).toBe(true);
    expect(isNightHour(6)).toBe(false);
    expect(isNightHour(20)).toBe(false);
  });
});

import { isRoomOpen, roomPlantings, ROOM_ORDER, ROOM_PLANTS } from "./garden";
describe("новые комнаты сада", () => {
  const zero = { pond: 0, potager: 0, glasshouse: 0, grotto: 0, physick: 0, moor: 0 };
  it("идут по порядку: оранжерея, грот, аптекарский дворик, пустошь", () => {
    expect(ROOM_ORDER).toEqual(["pond", "potager", "glasshouse", "grotto", "physick", "moor"]);
  });
  it("оранжерея открывается после 16 шагов в огороде", () => {
    expect(isRoomOpen("glasshouse", { ...zero, pond: 16, potager: 15 })).toBe(false);
    expect(isRoomOpen("glasshouse", { ...zero, pond: 16, potager: 16 })).toBe(true);
  });
  it("комнату нельзя перескочить", () => {
    expect(isRoomOpen("grotto", { ...zero, pond: 16, potager: 0, glasshouse: 20 })).toBe(false);
  });
  it("у каждой комнаты свои растения, первый шаг сажает первое", () => {
    expect(roomPlantings("grotto", 1).map((p) => p.id)).toEqual(["gr-viburnum"]);
    expect(ROOM_PLANTS.moor.every((p) => p.habitat === "moor")).toBe(true);
  });
});
