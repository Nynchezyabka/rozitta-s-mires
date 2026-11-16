import { BLOOMS, type BloomId } from "./coach";

export type GardenId = BloomId | "mushroom" | "fern" | "copper-fern" | "ajuga" | "veronica" | "moneywort" | "dogwood" | "hosta";
export type Habitat = "pond" | "woodland" | "edge" | "meadow" | "potager";
export type PotagerId = "p-romanesco" | "p-cabbage" | "chard" | "artichoke" | "kale" | "herbs" | "calendula" | "strawberry";
export type Room = "pond" | "potager";
export type Layer = "structure" | "perennial" | "groundcover" | "water";

export const HABITATS: Record<Habitat, string> = {
  pond: "Вода", woodland: "Лесная тень", edge: "Влажная опушка", meadow: "Солнечная поляна", potager: "Огород потаже",
};
export const LAYERS: Record<Layer, string> = {
  structure: "Каркас сада", perennial: "Средний ярус", groundcover: "Живой ковёр", water: "Водный ярус",
};

export type GardenPlant = {
  id: GardenId | PotagerId; name: string; botanical: string; habitat: Habitat; layer: Layer;
  x: number; y: number; size: number;
};

// Keep the original first eight rewards. Coordinates follow planted areas, never the path.
export const GARDEN_PLANTS: GardenPlant[] = [
  { ...BLOOMS[0], botanical: "Nymphaea", habitat: "pond", layer: "water", x: 60, y: 56, size: 12 },
  { ...BLOOMS[1], botanical: "Dianthus · Green Trick", habitat: "meadow", layer: "perennial", x: 58, y: 78, size: 11 },
  { ...BLOOMS[2], botanical: "Brassica oleracea · Romanesco", habitat: "meadow", layer: "perennial", x: 9, y: 62, size: 12 },
  { ...BLOOMS[3], botanical: "Eryngium", habitat: "meadow", layer: "perennial", x: 70, y: 72, size: 12 },
  { ...BLOOMS[4], botanical: "Rosa · Veggie", habitat: "meadow", layer: "perennial", x: 48, y: 70, size: 10 },
  { ...BLOOMS[5], botanical: "Chrysanthemum", habitat: "meadow", layer: "perennial", x: 30, y: 47, size: 12 },
  { ...BLOOMS[6], botanical: "Nymphaea", habitat: "pond", layer: "water", x: 77, y: 58, size: 12 },
  { ...BLOOMS[7], botanical: "Paeonia", habitat: "edge", layer: "perennial", x: 40, y: 40, size: 12 },
  { id: "mushroom", name: "Неоновые мицены", botanical: "Сказочные грибы · не ботанический вид", habitat: "woodland", layer: "groundcover", x: 83, y: 92, size: 10 },
  { id: "fern", name: "Зелёный папоротник", botanical: "Щитовник · Dryopteris", habitat: "woodland", layer: "perennial", x: 4, y: 50, size: 15 },
  { id: "copper-fern", name: "Медный папоротник", botanical: "Dryopteris erythrosora", habitat: "woodland", layer: "perennial", x: 93, y: 52, size: 14 },
  { id: "ajuga", name: "Живучка ползучая", botanical: "Ajuga reptans", habitat: "edge", layer: "groundcover", x: 40, y: 94, size: 15 },
  { id: "veronica", name: "Вероника волосистая", botanical: "Veronica · голубой цветочный ковёр", habitat: "edge", layer: "groundcover", x: 17, y: 88, size: 16 },
  { id: "moneywort", name: "Вербейник монетчатый", botanical: "Lysimachia nummularia", habitat: "edge", layer: "groundcover", x: 74, y: 86, size: 15 },
  { id: "dogwood", name: "Дёрен с красными ветками", botanical: "Cornus alba", habitat: "edge", layer: "structure", x: 88, y: 34, size: 17 },
  { id: "hosta", name: "Голубая хоста", botanical: "Hosta", habitat: "woodland", layer: "perennial", x: 62, y: 42, size: 14 },
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
/** Second garden room: opens through the arch once the pond has this many steps. */
export const POTAGER_UNLOCK = 16;
export const isPotagerOpen = (pondSteps: number) => pondSteps >= POTAGER_UNLOCK;

// Coordinates sit on the empty soil of the raised beds in potager.webp.
export const POTAGER_PLANTS: GardenPlant[] = [
  { id: "p-romanesco", name: "Романеско", botanical: "Brassica oleracea · Romanesco", habitat: "potager", layer: "perennial", x: 26, y: 46, size: 10 },
  { id: "calendula", name: "Календула", botanical: "Calendula officinalis", habitat: "potager", layer: "groundcover", x: 46, y: 60, size: 9 },
  { id: "chard", name: "Мангольд", botanical: "Beta vulgaris · Rainbow", habitat: "potager", layer: "perennial", x: 58, y: 38, size: 10 },
  { id: "herbs", name: "Пряные травы", botanical: "Salvia · Thymus · Rosmarinus", habitat: "potager", layer: "groundcover", x: 85, y: 44, size: 9 },
  { id: "p-cabbage", name: "Капустная роза", botanical: "Brassica oleracea · декоративная", habitat: "potager", layer: "perennial", x: 78, y: 74, size: 10 },
  { id: "artichoke", name: "Артишок", botanical: "Cynara scolymus", habitat: "potager", layer: "structure", x: 40, y: 32, size: 12 },
  { id: "kale", name: "Кейл Неро ди Тоскана", botanical: "Brassica oleracea · Cavolo nero", habitat: "potager", layer: "perennial", x: 17, y: 42, size: 10 },
  { id: "strawberry", name: "Земляника", botanical: "Fragaria vesca", habitat: "potager", layer: "groundcover", x: 88, y: 66, size: 8 },
];

export const potagerRewardAt = (index: number): GardenPlant => {
  const i = ((Math.trunc(index) % POTAGER_PLANTS.length) + POTAGER_PLANTS.length) % POTAGER_PLANTS.length;
  return POTAGER_PLANTS[i] ?? POTAGER_PLANTS[0]!;
};

export function potagerPlantings(total: number) {
  const count = Number.isFinite(total) ? Math.max(0, Math.trunc(total)) : 0;
  return POTAGER_PLANTS.flatMap((plant, index) => {
    const earned = count <= index ? 0 : Math.ceil((count - index) / POTAGER_PLANTS.length);
    return earned ? [{ ...plant, earned, copies: Math.min(3, earned) }] : [];
  });
}
