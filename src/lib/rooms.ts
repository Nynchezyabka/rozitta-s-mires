import wardrobe from "@/assets/space-wardrobe.webp";
import fridge from "@/assets/space-fridge.webp";
import library from "@/assets/space-library.webp";
import plants from "@/assets/space-plants.webp";
import rozitta from "@/assets/rozitta.webp";
import cabbage from "@/assets/cabbage.webp";

/** A room groups chests by words found in their "Где стоит" text. `notes` links the old quick list. */
export type Room = { key: string; title: string; icon: string; hint: string; img?: string; words: string[]; notes?: string };

export const ROOMS: Room[] = [
  { key: "wardrobe", title: "Шкаф и кладовая", icon: "🚪", hint: "Одежда, пледы, сезонное", img: wardrobe, words: ["шкаф", "кладов", "гардероб", "антресол", "коридор"], notes: "wardrobe" },
  { key: "kitchen", title: "Кухня и морозный ларь", icon: "❄️", hint: "Посуда, запасы, морозилка", img: fridge, words: ["кухн", "холодил", "морозил", "кладовк", "буфет"], notes: "fridge" },
  { key: "library", title: "Библиотека фолиантов", icon: "📚", hint: "Книги, журналы, комиксы", img: library, words: ["библиот", "книж", "кабинет"], notes: "library" },
  { key: "music", title: "Фонотека и граммофон", icon: "📻", hint: "Винил, кассеты, диафильмы, видео", words: ["фонотек", "винил", "пластин", "граммоф", "проигрыв", "стеллаж с музык"] },
  { key: "memory", title: "Память и архив", icon: "🎞️", hint: "Фото, плёнки, письма, VHS", words: ["архив", "памят", "альбом"] },
  { key: "workshop", title: "Мастерская", icon: "🛠️", hint: "Инструменты, ремонт, запчасти", words: ["мастерск", "инструмент", "верстак"] },
  { key: "art", title: "Для художеств", icon: "🎨", hint: "Краски, холсты, рукоделие", words: ["художеств", "творч", "мольберт", "рукодел", "студи"] },
  { key: "kids", title: "Детская", icon: "🧸", hint: "Игрушки, одежда на вырост", words: ["детск"] },
  { key: "garage", title: "Гараж", icon: "🚗", hint: "Колёса, лыжи, сноуборд", words: ["гараж"] },
  { key: "sport", title: "Спорт и колёса", icon: "🚲", hint: "Велосипеды, лыжи, походное", words: ["спорт", "велосип", "тренаж", "походн"] },
  { key: "beauty", title: "Будуар и ванная", icon: "🪞", hint: "Косметика, украшения, сумки", words: ["будуар", "ванн", "туалетн", "трюмо", "комод", "косметич", "шкатулк", "гардеробн"] },
  { key: "balcony", title: "Балкон и лоджия", icon: "🪴", hint: "Сезонное, банки, ящики", words: ["балкон", "лоджи"] },
  { key: "dacha", title: "Дача и сарай", icon: "🏡", hint: "Садовое, удобрения", words: ["дач", "сара", "погреб", "подвал"] },
  { key: "plants", title: "Оранжерея", icon: "🌿", hint: "Растения: полив и подкормка", img: plants, words: ["оранжер", "подоконник"], notes: "plants" },
  { key: "aid", title: "Зельеварня-аптечка", icon: "💊", hint: "Лекарства и пластыри", img: rozitta, words: ["аптечк", "лекарств"], notes: "aid" },
  { key: "other", title: "Всё остальное", icon: "🥬", hint: "Без комнаты", img: cabbage, words: [], notes: "home" },
];

export const DEFAULT_ROOMS = ["wardrobe", "kitchen", "library", "music", "workshop", "kids", "plants"];
export const roomByKey = (k: string) => ROOMS.find((r) => r.key === k);

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е");

/** Chests whose place mentions the room; "other" gets those no other room claims. */
export function inRoom<T extends { location: string | null }>(room: Room, boxes: T[]): T[] {
  const hit = (r: Room, b: T) => !!b.location && r.words.some((w) => norm(b.location!).includes(w));
  if (room.key === "other") return boxes.filter((b) => !ROOMS.some((r) => r.key !== "other" && hit(r, b)));
  return boxes.filter((b) => hit(room, b));
}

const KEY = "rooms-shown";
export function getShownRooms(): string[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "null"); return Array.isArray(v) ? v : DEFAULT_ROOMS; } catch { return DEFAULT_ROOMS; }
}
export function setShownRooms(keys: string[]) { localStorage.setItem(KEY, JSON.stringify(keys)); }
