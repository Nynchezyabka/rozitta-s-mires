import wardrobe from "@/assets/space-wardrobe.webp";
import fridge from "@/assets/space-fridge.webp";
import library from "@/assets/space-library.webp";
import plants from "@/assets/space-plants.webp";
import rozitta from "@/assets/rozitta.webp";
import cabbage from "@/assets/cabbage.webp";
import room_music from "@/assets/space-music.webp";
import room_memory from "@/assets/space-memory.webp";
import room_workshop from "@/assets/space-workshop.webp";
import room_art from "@/assets/space-art.webp";
import room_kids from "@/assets/space-kids.webp";
import room_garage from "@/assets/space-garage.webp";
import room_sport from "@/assets/space-sport.webp";
import room_beauty from "@/assets/space-beauty.webp";
import room_balcony from "@/assets/space-balcony.webp";
import room_dacha from "@/assets/space-dacha.webp";
import { searchWords } from "./search";

/** A room groups chests by words found in their "Где стоит" text. `notes` links the old quick list. */
export type Room = { key: string; title: string; icon: string; hint: string; img?: string; words: string[]; notes?: string };

export const ROOMS: Room[] = [
  { key: "wardrobe", title: "Гардеробная и шкафы", icon: "🚪", hint: "Одежда, пледы, сезонное", img: wardrobe, words: ["шкаф", "кладов", "гардероб", "антресол", "коридор"], notes: "wardrobe" },
  { key: "kitchen", title: "Кухня и морозный ларь", icon: "❄️", hint: "Посуда, запасы, морозилка", img: fridge, words: ["кухн", "холодил", "морозил", "буфет"], notes: "fridge" },
  { key: "library", title: "Библиотека фолиантов", icon: "📚", hint: "Книги, журналы, комиксы", img: library, words: ["библиот", "книж", "кабинет"], notes: "library" },
  { key: "music", img: room_music, title: "Фонотека и граммофон", icon: "📻", hint: "Винил, кассеты, диафильмы, видео", words: ["фонотек", "винил", "пластин", "граммоф", "проигрыв", "стеллаж с музык"] },
  { key: "memory", img: room_memory, title: "Память и архив", icon: "🎞️", hint: "Фото, плёнки, письма, VHS", words: ["архив", "памят", "альбом"] },
  { key: "workshop", img: room_workshop, title: "Мастерская", icon: "🛠️", hint: "Инструменты, ремонт, запчасти", words: ["мастерск", "инструмент", "верстак"] },
  { key: "art", img: room_art, title: "Для художеств", icon: "🎨", hint: "Краски, холсты, рукоделие", words: ["художеств", "творч", "мольберт", "рукодел", "студи"] },
  { key: "kids", img: room_kids, title: "Детская", icon: "🧸", hint: "Игрушки, одежда на вырост", words: ["детск"] },
  { key: "garage", img: room_garage, title: "Гараж", icon: "🚗", hint: "Колёса, лыжи, сноуборд", words: ["гараж"] },
  { key: "sport", img: room_sport, title: "Спорт и колёса", icon: "🚲", hint: "Велосипеды, лыжи, походное", words: ["спорт", "велосип", "тренаж", "походн"] },
  { key: "beauty", img: room_beauty, title: "Будуар и ванная", icon: "🪞", hint: "Косметика, украшения, сумки", words: ["будуар", "ванн", "туалетн", "трюмо", "комод", "косметич", "шкатулк"] },
  { key: "balcony", img: room_balcony, title: "Балкон и лоджия", icon: "🪴", hint: "Сезонное, банки, ящики", words: ["балкон", "лоджи"] },
  { key: "dacha", img: room_dacha, title: "Дача и сарай", icon: "🏡", hint: "Садовое, удобрения", words: ["дач", "сара", "погреб", "подвал"] },
  { key: "plants", title: "Оранжерея", icon: "🌿", hint: "Растения: полив и подкормка", img: plants, words: ["оранжер", "подоконник"], notes: "plants" },
  { key: "aid", title: "Зельеварня-аптечка", icon: "💊", hint: "Лекарства и пластыри", img: rozitta, words: ["аптечк", "лекарств"], notes: "aid" },
  { key: "other", title: "Всё остальное", icon: "🥬", hint: "Без комнаты", img: cabbage, words: [], notes: "home" },
];

export const DEFAULT_ROOMS = ["wardrobe", "kitchen", "library", "music", "workshop", "kids", "plants"];
export const roomByKey = (k: string) => ROOMS.find((r) => r.key === k);

/** Physical rooms outrank furniture/content: a wardrobe in a nursery belongs to the nursery. */
const PLACE_WORDS: Record<string, string[]> = {
  wardrobe: ["гардероб", "кладов", "коридор"], kitchen: ["кухн"],
  library: ["библиот", "кабинет"], music: ["фонотек"], memory: ["архив"],
  workshop: ["мастерск"], art: ["студи", "художеств"], kids: ["детск"],
  garage: ["гараж"], sport: ["спортзал"], beauty: ["будуар", "ванн"],
  balcony: ["балкон", "лоджи"], dacha: ["дач", "сара", "погреб", "подвал"],
  plants: ["оранжер"], aid: ["аптечк", "зельевар"],
};

/** One deterministic assignment, independent of which rooms the device displays. */
export function roomForLocation(location: string | null): Room | undefined {
  const words = searchWords(location ?? "");
  const candidates = ROOMS.flatMap((room) => {
    const patterns = [...room.words, ...(PLACE_WORDS[room.key] ?? [])];
    return patterns.flatMap((pattern) => {
      const parts = searchWords(pattern);
      const start = words.findIndex((_, i) => parts.every((part, j) => words[i + j]?.startsWith(part)));
      return start < 0 ? [] : [{ room, start, physical: (PLACE_WORDS[room.key] ?? []).includes(pattern), length: pattern.length }];
    });
  });
  candidates.sort((a, b) => Number(b.physical) - Number(a.physical) || a.start - b.start || b.length - a.length);
  return candidates[0]?.room ?? roomByKey("other");
}

/** Chests appear in exactly one room; unrecognized places go to "other". */
export function inRoom<T extends { location: string | null }>(room: Room, boxes: T[]): T[] {
  return boxes.filter((b) => roomForLocation(b.location)?.key === room.key);
}

const KEY = "rooms-shown";
export function getShownRooms(): string[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "null"); return Array.isArray(v) ? v : DEFAULT_ROOMS; } catch { return DEFAULT_ROOMS; }
}
export function setShownRooms(keys: string[]) { localStorage.setItem(KEY, JSON.stringify(keys)); }
