import wardrobe from "@/assets/space-wardrobe.webp";
import fridge from "@/assets/space-fridge.webp";
import library from "@/assets/space-library.webp";
import plants from "@/assets/space-plants.webp";
import rozitta from "@/assets/rozitta.webp";
import cabbage from "@/assets/cabbage.webp";

export type Space = { key: string; title: string; hint: string; img: string; plants?: boolean; starter: string[] };

export const SPACES: Space[] = [
  { key: "wardrobe", title: "Шкаф в Нарнию", hint: "Одежда, пледы, то, что надевают раз в год", img: wardrobe, starter: ["Зимние куртки", "Пледы", "Карнавальные костюмы", "Летняя обувь"] },
  { key: "fridge", title: "Морозный ларь", hint: "Холодильник и морозилка: что и когда заморожено", img: fridge, starter: ["Ягоды", "Пельмени", "Бульон", "Зелень"] },
  { key: "library", title: "Библиотека фолиантов", hint: "Книги, кому одолжили, что прочитать", img: library, starter: ["Сказки Прокофьевой", "Учебники", "Комиксы"] },
  { key: "plants", title: "Оранжерея", hint: "Растения: когда полила и удобрила", img: plants, plants: true, starter: ["Монстера", "Фикус", "Пионы на даче"] },
  { key: "aid", title: "Зельеварня-аптечка", hint: "Лекарства, пластыри, градусник", img: rozitta, starter: ["Пластыри", "Жаропонижающее", "Градусник"] },
  { key: "home", title: "Всё остальное в доме", hint: "Документы, инструменты, декор", img: cabbage, starter: ["Документы", "Инструменты", "Ёлочные игрушки", "Зарядки"] },
];

export const spaceByKey = (k: string) => SPACES.find((s) => s.key === k);

/** "сегодня" / "вчера" / "5 дн. назад" */
export function ago(iso: string | null, now = Date.now()): string {
  if (!iso) return "ещё не было";
  const d = Math.floor((now - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "сегодня" : d === 1 ? "вчера" : `${d} дн. назад`;
}
