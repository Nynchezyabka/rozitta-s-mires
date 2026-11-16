/** Rozitta the coach: one tiny task at a time, and a garden that only grows (never wilts). */
export type CoachMode = "paws" | "workshop" | "storm";

export const COACH_MODES: { id: CoachMode; icon: string; label: string; hint: string }[] = [
  { id: "paws", icon: "🪷", label: "У меня лапки", hint: "2 минуты, бережно" },
  { id: "workshop", icon: "🛠️", label: "Мастерская", hint: "крепёж, краски, ремонт" },
  { id: "storm", icon: "⚡", label: "Штурм 5 минут", hint: "быстро и весело" },
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
export const bloomAt = (n: number) => BLOOMS[n % BLOOMS.length]!;

const GARDEN = "rozitta-garden";
export const getGarden = () => (typeof localStorage === "undefined" ? 0 : Number(localStorage.getItem(GARDEN) ?? 0) || 0);
export function addBloom(): number {
  const n = getGarden() + 1;
  localStorage.setItem(GARDEN, String(n));
  return n;
}

export function nextTask(mode: CoachMode, prev?: string): string {
  const list = COACH_TASKS[mode].filter((t) => t !== prev);
  return list[Math.floor(Math.random() * list.length)]!;
}
