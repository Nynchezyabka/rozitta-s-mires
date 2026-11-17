/** Item tags (categories): bright auto colours from Rozitta's palette, optional per-device overrides. */
export const TAG_COLORS = ["#7CFF3A", "#FFB547", "#C38BFF", "#FF7AB6", "#3FE0C5", "#FFE45C", "#FF8A5C", "#6FB7FF", "#B8F06A", "#E58FFF"];
const KEY = "rozitta-tag-colors";

/** One spelling per tag: trimmed, single spaces, capital first letter. */
export function normTag(t: string | null | undefined): string | null {
  const s = (t ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  return s ? s[0]!.toUpperCase() + s.slice(1) : null;
}

/** Same name → same colour on every device, without storing anything. */
export function autoTagColor(tag: string): string {
  let h = 0;
  for (const c of tag.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TAG_COLORS[h % TAG_COLORS.length]!;
}

function overrides(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}
export const tagColor = (tag: string) => overrides()[tag.toLowerCase()] ?? autoTagColor(tag);
export function setTagColor(tag: string, color: string | null) {
  const o = overrides();
  if (color) o[tag.toLowerCase()] = color; else delete o[tag.toLowerCase()];
  localStorage.setItem(KEY, JSON.stringify(o));
}

/** Tag cloud: how many things carry each tag, biggest first. */
export function tagCounts(items: { category?: string | null }[]): { tag: string; count: number }[] {
  const m = new Map<string, { tag: string; count: number }>();
  for (const it of items) {
    const t = normTag(it.category);
    if (!t) continue;
    const k = t.toLowerCase();
    const cur = m.get(k);
    if (cur) cur.count++; else m.set(k, { tag: t, count: 1 });
  }
  return [...m.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "ru"));
}

/** [word stems, tag]. First match wins; stems match the start of any word. Edit freely. */
const TAG_HINTS: [string[], string][] = [
  [["губк", "тряпк", "швабр", "моющ", "чистящ", "порош", "мешки для мус", "перчатки резин"], "Уборка"],
  [["книг", "роман", "сказк", "журнал", "комикс", "энциклопед", "словар", "учебник"], "Книги"],
  [["винил", "пластин", "кассет", "граммоф", "диск", "cd", "проигрыват"], "Музыка"],
  [["диафильм", "видеокас", "vhs", "плёнк", "пленк", "слайд", "альбом", "фотограф", "письм", "открытк"], "Память"],
  [["лекарств", "таблет", "витамин", "бинт", "пластыр", "мазь", "мази", "сироп", "капл", "градусник", "термометр", "аптечк", "спрей"], "Аптечка"],
  [["зарядк", "кабел", "провод", "наушник", "телефон", "планшет", "ноутбук", "мыш", "клавиатур", "роутер", "пульт", "адаптер", "флешк", "батаре", "аккумулятор", "колонк", "камер", "удлинит", "лампоч"], "Электроника"],
  [["молот", "отвёрт", "отверт", "дрел", "шуруп", "гвозд", "болт", "гайк", "ключ", "пил", "рулетк", "плоскогубц", "изолент", "инструмент", "дюбел", "уровень"], "Инструменты"],
  [["краск", "кист", "холст", "карандаш", "фломастер", "маркер", "пряж", "нитк", "спиц", "бисер", "клей", "ножниц", "ткан", "акварел", "гуаш"], "Творчество"],
  [["крем", "помад", "тушь", "тени", "пудр", "дух", "парфюм", "шампун", "бальзам", "маск", "лак", "расческ", "расчёск", "фен", "плойк", "косметик"], "Косметика"],
  [["кольц", "серьг", "бус", "колье", "браслет", "брош", "кулон", "цепочк", "украшен", "бижутер", "час"], "Украшения"],
  [["сумк", "клатч", "рюкзак", "чемодан", "кошел", "косметичк", "шоппер"], "Сумки"],
  [["свитер", "куртк", "плать", "футбол", "брюк", "джинс", "юбк", "рубаш", "кофт", "носк", "колготк", "шарф", "шапк", "перчат", "варежк", "пальто", "пижам", "одежд", "белье", "бельё"], "Одежда"],
  [["обув", "ботин", "сапог", "кроссов", "туфл", "тапк", "кед", "сандал"], "Обувь"],
  [["подушк", "одеял", "простын", "плед", "полотенц", "наволоч", "пододеяль", "покрывал", "штор", "скатерт"], "Текстиль"],
  [["тарел", "кружк", "чашк", "кастрюл", "сковор", "ложк", "вилк", "нож", "бокал", "стакан", "миск", "посуд", "чайник", "термос", "контейнер"], "Посуда"],
  [["круп", "макарон", "консерв", "специ", "чай", "кофе", "сахар", "мук", "варень", "банк"], "Продукты"],
  [["игрушк", "кукл", "машинк", "лего", "конструктор", "пазл", "мяг", "погремуш", "мишк"], "Игрушки"],
  [["велосип", "самокат", "ролик", "лыж", "сноуборд", "коньк", "мяч", "гантел", "коврик", "ракетк", "палатк", "спальник", "шлем", "удочк"], "Спорт"],
  [["семен", "семян", "горш", "кашп", "грунт", "удобрен", "лейк", "секатор", "лопат", "рассад"], "Сад"],
  [["гирлянд", "ёлоч", "елоч", "новогод", "мишур", "игрушки на"], "Праздник"],
  [["документ", "паспорт", "договор", "чек", "квитан", "справк", "папк", "бумаг"], "Документы"],
  [["корм", "поводок", "поводк", "ошейник", "лоток", "когтеточ", "аквариум", "фильтр для акв"], "Питомцы"],
];

/** Guesses a tag from a thing's name; reuses an existing tag of the same spelling. Null when unsure. */
export function suggestTag(name: string): string | null {
  const text = name.toLowerCase().replace(/ё/g, "е");
  const words = text.split(/[^a-zа-я0-9]+/i).filter(Boolean);
  for (const [stems, tag] of TAG_HINTS) {
    if (stems.some((s) => { const st = s.replace(/ё/g, "е"); return st.includes(" ") ? text.includes(st) : words.some((w) => w.startsWith(st)); })) return tag;
  }
  return null;
}

const TAG_ICONS: Record<string, string> = {
  "уборка": "🧽", "книги": "📚", "музыка": "📻", "память": "🎞️", "аптечка": "💊", "электроника": "🔌", "инструменты": "🛠️",
  "творчество": "🎨", "косметика": "💄", "украшения": "💍", "сумки": "👜", "одежда": "👗", "обувь": "👢", "текстиль": "🧶",
  "посуда": "🍵", "продукты": "🫙", "игрушки": "🧸", "спорт": "🚲", "сад": "🌱", "праздник": "🎄", "документы": "📜",
  "питомцы": "🐾", "декор": "🖼️", "освещение": "🕯️", "канцелярия": "✏️", "мебель": "🪑", "хобби": "🎲",
};
/** Emoji for a tag; a little crystal for anything unknown. */
export const tagIcon = (tag: string) => TAG_ICONS[tag.toLowerCase().replace(/ё/g, "е")] ?? "🔮";
