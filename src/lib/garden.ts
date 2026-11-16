import { BLOOMS, type BloomId } from "./coach";

export type GardenId = BloomId | "mushroom" | "fern" | "copper-fern" | "ajuga" | "veronica" | "moneywort" | "dogwood" | "hosta";
export type Habitat = "pond" | "woodland" | "edge" | "meadow";
export type Layer = "structure" | "perennial" | "groundcover" | "water";

export const HABITATS: Record<Habitat, string> = {
  pond: "Вода", woodland: "Лесная тень", edge: "Влажная опушка", meadow: "Солнечная поляна",
};
export const LAYERS: Record<Layer, string> = {
  structure: "Каркас сада", perennial: "Средний ярус", groundcover: "Живой ковёр", water: "Водный ярус",
};

export type GardenPlant = {
  id: GardenId; name: string; botanical: string; habitat: Habitat; layer: Layer;
  x: number; y: number; size: number;
};

// Keep the original first eight rewards. Coordinates follow planted areas, never the path.
export const GARDEN_PLANTS: GardenPlant[] = [
  { ...BLOOMS[0], botanical: "Nymphaea", habitat: "pond", layer: "water", x: 73, y: 60, size: 12 },
  { ...BLOOMS[1], botanical: "Dianthus · Green Trick", habitat: "meadow", layer: "perennial", x: 25, y: 76, size: 11 },
  { ...BLOOMS[2], botanical: "Brassica oleracea · Romanesco", habitat: "meadow", layer: "perennial", x: 12, y: 67, size: 12 },
  { ...BLOOMS[3], botanical: "Eryngium", habitat: "meadow", layer: "perennial", x: 44, y: 34, size: 12 },
  { ...BLOOMS[4], botanical: "Rosa · Veggie", habitat: "meadow", layer: "perennial", x: 34, y: 61, size: 10 },
  { ...BLOOMS[5], botanical: "Chrysanthemum", habitat: "meadow", layer: "perennial", x: 22, y: 53, size: 12 },
  { ...BLOOMS[6], botanical: "Nymphaea", habitat: "pond", layer: "water", x: 85, y: 75, size: 12 },
  { ...BLOOMS[7], botanical: "Paeonia", habitat: "edge", layer: "perennial", x: 19, y: 41, size: 12 },
  { id: "mushroom", name: "Неоновые мицены", botanical: "Сказочные грибы · не ботанический вид", habitat: "woodland", layer: "groundcover", x: 8, y: 38, size: 10 },
  { id: "fern", name: "Зелёный папоротник", botanical: "Щитовник · Dryopteris", habitat: "woodland", layer: "perennial", x: 28, y: 35, size: 15 },
  { id: "copper-fern", name: "Медный папоротник", botanical: "Dryopteris erythrosora", habitat: "woodland", layer: "perennial", x: 10, y: 52, size: 14 },
  { id: "ajuga", name: "Живучка ползучая", botanical: "Ajuga reptans", habitat: "edge", layer: "groundcover", x: 31, y: 88, size: 15 },
  { id: "veronica", name: "Вероника волосистая", botanical: "Veronica · голубой цветочный ковёр", habitat: "edge", layer: "groundcover", x: 16, y: 93, size: 16 },
  { id: "moneywort", name: "Вербейник монетчатый", botanical: "Lysimachia nummularia", habitat: "edge", layer: "groundcover", x: 63, y: 86, size: 15 },
  { id: "dogwood", name: "Дёрен с красными ветками", botanical: "Cornus alba", habitat: "edge", layer: "structure", x: 13, y: 24, size: 17 },
  { id: "hosta", name: "Голубая хоста", botanical: "Hosta", habitat: "woodland", layer: "perennial", x: 35, y: 48, size: 14 },
];

export function gardenRewardAt(index: number): GardenPlant {
  const i = ((Math.trunc(index) % GARDEN_PLANTS.length) + GARDEN_PLANTS.length) % GARDEN_PLANTS.length;
  return GARDEN_PLANTS[i] ?? GARDEN_PLANTS[0] ?? { id: "lily", name: "Кувшинка", botanical: "Nymphaea", habitat: "pond", layer: "water", x: 73, y: 60, size: 12 };
}

/** Repeated rewards thicken permanent drifts rather than replacing earlier plants. */
export function gardenPlantings(total: number) {
  const count = Number.isFinite(total) ? Math.max(0, Math.trunc(total)) : 0;
  return GARDEN_PLANTS.flatMap((plant, index) => {
    const earned = count <= index ? 0 : Math.ceil((count - index) / GARDEN_PLANTS.length);
    return earned ? [{ ...plant, earned, copies: Math.min(3, earned) }] : [];
  });
}