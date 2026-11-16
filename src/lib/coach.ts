/** Rozitta the coach: one tiny task at a time, and a garden that only grows (never wilts). */
export type CoachMode = "paws" | "workshop" | "storm";

export const COACH_MODES: { id: CoachMode; icon: string; label: string; hint: string }[] = [
  { id: "paws", icon: "🪷", label: "Нет сил", hint: "1–2 минуты, бережно" },
  { id: "workshop", icon: "🛠️", label: "Мастерская", hint: "инструменты, ремонт" },
  { id: "storm", icon: "⚡", label: "Быстрый рывок", hint: "5 минут, весело" },
];

export const COACH_TASKS: Record<CoachMode, string[]> = {
  paws: [
    "Выпей стакан воды. Всё, это тоже считается.",
    "Найди три вещи не на своём месте и просто донеси их до стола.",
    "Выброси два чека из сумки или кармана.",
    "Отнеси одну чашку на кухню. Ты умница.",
    "Сложи одну вещь, которая лежит на стуле.",
    "Протри одну полочку — только одну.",
    "Положи телефон, ляг на 5 минут и подыши. Шкаф подождёт до завтра.",
    "Выкинь одну пустую упаковку, которая давно мозолит глаза.",
    "Открой окно на пару минут — болоту нужен свежий воздух.",
  ],
  workshop: [
    "Собери все болты, гайки и шурупы в одну банку.",
    "Смотай один удлинитель или провод и закрепи изолентой.",
    "Проверь кисти: засохшие — в мусор, живые — в стакан.",
    "Найди рулетку и положи туда, где будешь искать её в следующий раз.",
    "Выкинь один провод, от которого уже нет устройства.",
    "Подпиши одну коробку с крепежом маркером.",
    "Проверь банки с краской: засохшие — на выброс.",
    "Положи все отвёртки в одно место.",
    "Сложи остатки наждачки в один пакет.",
  ],
  storm: [
    "5 минут: верни на место 5 любых вещей. Время пошло!",
    "Включи любимый трек и разбери стол, пока он играет.",
    "Собери всё, что лежит на полу в одной комнате, за 5 минут.",
    "5 минут: наполни один пакет тем, что пора выбросить.",
    "Разбери один ящик целиком — ровно 5 минут, не больше.",
    "Сфотографируй один сундук и запиши его в Хроники.",
  ],
};

/** Garden pieces in the order they appear; ids map to pixel pictures in the component. */
export const BLOOMS = [
  { id: "lily", name: "Розовая кувшинка" },
  { id: "kiwi", name: "Моховой шарик-киви" },
  { id: "romanesco", name: "Капуста романеско" },
  { id: "eryngium", name: "Синий эрингиум" },
  { id: "veggie", name: "Роза «вегги»" },
  { id: "chrysanthemum", name: "Винная хризантема" },
  { id: "lily2", name: "Сиреневая кувшинка" },
  { id: "peony", name: "Пион" },
] as const;
export type BloomId = (typeof BLOOMS)[number]["id"];

/** n-th bloom (0-based) in the garden: cycles through all kinds. */
export const bloomAt = (n: number) => BLOOMS[((Math.trunc(n) % BLOOMS.length) + BLOOMS.length) % BLOOMS.length] ?? BLOOMS[0];

const GARDEN = "rozitta-garden";
export const getGarden = () => {
  if (typeof localStorage === "undefined") return 0;
  const value = Number(localStorage.getItem(GARDEN) ?? 0);
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
};
export function addBloom(): number {
  const n = getGarden() + 1;
  localStorage.setItem(GARDEN, String(n));
  return n;
}

export function nextTask(mode: CoachMode, prev?: string): string {
  const list = COACH_TASKS[mode].filter((t) => t !== prev);
  return list[Math.floor(Math.random() * list.length)] ?? COACH_TASKS[mode][0] ?? "Отдохни минутку. Это тоже считается.";
}

const POTAGER = "rozitta-potager";
/** Steps planted in the potager; pond steps = getGarden() - getPotager(). */
export const getPotager = () => {
  if (typeof localStorage === "undefined") return 0;
  const value = Number(localStorage.getItem(POTAGER) ?? 0);
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
};
export function addPotager(): number {
  const n = getPotager() + 1;
  localStorage.setItem(POTAGER, String(n));
  return n;
}

const LOG = "rozitta-garden-log";
export type GardenLogEntry = { at: number; what: string; plant: string };
export function getGardenLog(): GardenLogEntry[] {
  if (typeof localStorage === "undefined") return [];
  try { const v = JSON.parse(localStorage.getItem(LOG) ?? "[]"); return Array.isArray(v) ? v.slice(0, 5) : []; } catch { return []; }
}
export function addGardenLog(entry: GardenLogEntry): GardenLogEntry[] {
  const list = [entry, ...getGardenLog()].slice(0, 5);
  localStorage.setItem(LOG, JSON.stringify(list));
  return list;
}

const NIGHT = "rozitta-garden-night";
export const getNight = () => typeof localStorage !== "undefined" && localStorage.getItem(NIGHT) === "1";
export const setNightPref = (on: boolean) => localStorage.setItem(NIGHT, on ? "1" : "0");
