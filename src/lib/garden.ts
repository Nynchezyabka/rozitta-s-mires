import { BLOOMS, type BloomId } from "./coach";

export type GardenId = BloomId | "mushroom" | "fern" | "copper-fern" | "ajuga" | "veronica" | "moneywort" | "dogwood" | "hosta";
export type Habitat = "pond" | "woodland" | "edge" | "meadow" | "potager" | "glasshouse" | "grotto" | "physick" | "moor";
export type PotagerId = "p-romanesco" | "p-cabbage" | "chard" | "artichoke" | "kale" | "herbs" | "calendula" | "strawberry";
export type NewRoomPlantId =
  | "gl-magnolia" | "gl-leucadendron" | "gl-chrysanthemum" | "gl-treefern" | "gl-ficus"
  | "gr-viburnum" | "gr-adiantum" | "gr-asarum" | "gr-hellebore" | "gr-cyclamen"
  | "ph-digitalis" | "ph-angelica" | "ph-artemisia" | "ph-salvia" | "ph-thyme"
  | "mo-eryngium" | "mo-sanguisorba" | "mo-heather" | "mo-deschampsia" | "mo-anemone";
export type Room = "pond" | "potager" | "glasshouse" | "grotto" | "physick" | "moor";
export type Layer = "structure" | "perennial" | "groundcover" | "water";

export const HABITATS: Record<Habitat, string> = {
  pond: "Вода", woodland: "Лесная тень", edge: "Влажная опушка", meadow: "Солнечная поляна", potager: "Огород потаже",
  glasshouse: "Тёплая оранжерея", grotto: "Сырой каменистый грот", physick: "Сухой аптекарский дворик", moor: "Открытая пустошь",
};
export const LAYERS: Record<Layer, string> = {
  structure: "Каркас сада", perennial: "Средний ярус", groundcover: "Живой ковёр", water: "Водный ярус",
};

export type GardenPlant = {
  id: GardenId | PotagerId | NewRoomPlantId; name: string; botanical: string; habitat: Habitat; layer: Layer;
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

/** Night garden from 21:00 to 06:00 local device time. */
export const isNightHour = (hour: number) => hour >= 21 || hour < 6;

const p = (id: NewRoomPlantId, name: string, botanical: string, habitat: Habitat, layer: Layer, x: number, y: number, size: number): GardenPlant =>
  ({ id, name, botanical, habitat, layer, x, y, size });

/** Rooms in walking order; each opens after ROOM_UNLOCK steps in the previous one. */
export const ROOM_ORDER: Room[] = ["pond", "potager", "glasshouse", "grotto", "physick", "moor"];
export const ROOM_UNLOCK = POTAGER_UNLOCK;
export const ROOM_NAMES: Record<Room, string> = {
  pond: "Лесной пруд", potager: "Огород потаже", glasshouse: "Старая оранжерея",
  grotto: "Мшистый грот", physick: "Аптекарский дворик", moor: "Сумеречная пустошь",
};
export const ROOM_EMPTY: Record<Room, string> = {
  pond: "Пруд ждёт первую кувшинку. Розитта никуда не торопится.",
  potager: "Грядки ждут первый шаг. Следующий посадит романеско.",
  glasshouse: "Под стеклом тепло и пусто. Первой поселится магнолия.",
  grotto: "У родника тихо. Первый шаг посадит калину-пагоду.",
  physick: "Каменные грядки ждут трав. Первой взойдёт наперстянка.",
  moor: "Над пустошью первая звезда. Первым вырастет синеголовник.",
};

// Coordinates sit on the open soil, beds and grass of each background.
export const ROOM_PLANTS: Record<Room, GardenPlant[]> = {
  pond: GARDEN_PLANTS,
  potager: POTAGER_PLANTS,
  glasshouse: [
    p("gl-magnolia", "Магнолия крупноцветковая", "Magnolia grandiflora", "glasshouse", "structure", 62, 62, 15),
    p("gl-chrysanthemum", "Хризантемы: винный помпон и персиковый паук", "Chrysanthemum", "glasshouse", "perennial", 80, 70, 11),
    p("gl-treefern", "Древовидный папоротник", "Dicksonia antarctica", "glasshouse", "structure", 28, 82, 14),
    p("gl-leucadendron", "Леукадендрон", "Leucadendron", "glasshouse", "perennial", 46, 70, 11),
    p("gl-ficus", "Фикус карликовый", "Ficus pumila", "glasshouse", "groundcover", 90, 90, 11),
  ],
  grotto: [
    p("gr-viburnum", "Калина складчатая", "Viburnum plicatum", "grotto", "structure", 30, 62, 16),
    p("gr-hellebore", "Морозник", "Helleborus × hybridus", "grotto", "perennial", 50, 72, 11),
    p("gr-adiantum", "Адиантум, венерин волос", "Adiantum pedatum", "grotto", "perennial", 62, 50, 11),
    p("gr-asarum", "Копытень европейский", "Asarum europaeum", "grotto", "groundcover", 22, 88, 13),
    p("gr-cyclamen", "Цикламен плющелистный", "Cyclamen hederifolium", "grotto", "groundcover", 44, 92, 11),
  ],
  physick: [
    p("ph-digitalis", "Наперстянка пурпурная", "Digitalis purpurea", "physick", "structure", 50, 56, 11),
    p("ph-artemisia", "Полынь серебристая", "Artemisia absinthium", "physick", "perennial", 26, 82, 12),
    p("ph-angelica", "Дягиль", "Angelica archangelica", "physick", "structure", 70, 52, 13),
    p("ph-salvia", "Шалфей мускатный", "Salvia sclarea", "physick", "perennial", 40, 86, 11),
    p("ph-thyme", "Тимьян ползучий", "Thymus serpyllum", "physick", "groundcover", 60, 80, 10),
  ],
  moor: [
    p("mo-eryngium", "Синеголовник", "Eryngium", "moor", "structure", 52, 66, 11),
    p("mo-heather", "Вереск", "Calluna vulgaris", "moor", "groundcover", 70, 86, 13),
    p("mo-sanguisorba", "Кровохлёбка лекарственная", "Sanguisorba officinalis", "moor", "perennial", 38, 72, 12),
    p("mo-deschampsia", "Щучка дернистая", "Deschampsia cespitosa", "moor", "perennial", 82, 68, 13),
    p("mo-anemone", "Анемона японская", "Anemone × hybrida", "moor", "perennial", 60, 58, 11),
  ],
};

export function roomPlantings(room: Room, total: number) {
  const list = ROOM_PLANTS[room];
  const count = Number.isFinite(total) ? Math.max(0, Math.trunc(total)) : 0;
  return list.flatMap((plant, index) => {
    const earned = count <= index ? 0 : Math.ceil((count - index) / list.length);
    return earned ? [{ ...plant, earned, copies: Math.min(3, earned) }] : [];
  });
}
export function roomRewardAt(room: Room, index: number): GardenPlant {
  const list = ROOM_PLANTS[room];
  const i = ((Math.trunc(index) % list.length) + list.length) % list.length;
  return list[i] ?? list[0]!;
}
/** Room opens when the previous room in ROOM_ORDER has ROOM_UNLOCK steps. */
export function isRoomOpen(room: Room, steps: Record<Room, number>): boolean {
  const i = ROOM_ORDER.indexOf(room);
  if (i <= 0) return true;
  const prev = ROOM_ORDER[i - 1]!;
  return isRoomOpen(prev, steps) && (steps[prev] ?? 0) >= ROOM_UNLOCK;
}
