/** Built-in AI fallback (Lovable only). On static hosting the family's own key is used instead. */
import { createServerFn } from "@tanstack/react-start";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function householdFor(token: string) {
  if (!token || token.length < 20) throw new Error("Нет доступа");
  const db = await admin();
  const { data } = await db.from("households").select("id, name").eq("token", token).maybeSingle();
  if (!data) throw new Error("Дом не найден — проверьте ссылку");
  return { db, household: data };
}

type Tok = { token: string };
const tok = <T extends Tok>(i: T): T => {
  if (typeof i?.token !== "string") throw new Error("token required");
  return i;
};

export type Recognized = {
  items: { name: string; author?: string | null; needs_review?: boolean; category?: string | null }[];
  group: string | null;
};

export const recognizePhoto = createServerFn({ method: "POST" })
  .inputValidator((i: Tok & { photo: string; mode: "box" | "books" }) => tok(i))
  .handler(async ({ data }): Promise<Recognized> => {
    const { db, household } = await householdFor(data.token);
    const { data: groups } = await db.from("groups").select("name").eq("household_id", household.id);
    const names = (groups ?? []).map((g) => g.name).join(", ");
    const { generateResponse } = await import("@lovable.dev/ai-gateway");
    const task =
      data.mode === "books"
        ? `На фото обложки или корешки книг. Для каждой книги верни название (name) и автора (author). Если не уверен в названии или авторе — поставь needs_review: true. Старые книги без ISBN часто читаются плохо — тогда тоже needs_review: true.`
        : `На фото могут быть любые вещи: содержимое коробки или шкафа, книги, лекарства. Перечисли всё коротко по-русски (name), объединяя однотипные ("Полотенца, 4 шт"). Для книги укажи автора (author), если читается. Для лекарства добавь к названию коротко, от чего оно ("Нурофен — от боли и жара"). Не больше 25 пунктов. needs_review: true, если вещь видна плохо.`;
    const prompt = `${task}
Каждой вещи дай метку category: 1–2 слова, к чему она относится (например "Электроника", "Аквариум", "Косметика"). Подойдёт любая тема.
group — общая группа для всего фото. Если подходит одна из групп дома (${names}), напиши её. Если нет — придумай короткое название новой группы. Если вещи совсем разные — "Разное".
Верни только JSON: {"items":[{"name":"...","category":"...","author":null,"needs_review":false}],"group":"..."}`;
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              { type: "input_image", image_url: data.photo, detail: "auto" },
            ],
          },
        ],
        text: { format: { type: "json_object" } },
      });
      const text = extractText(res);
      const parsed = JSON.parse(text) as Partial<Recognized>;
      return {
        items: Array.isArray(parsed.items) ? parsed.items.filter((x) => x && typeof x.name === "string") : [],
        group: typeof parsed.group === "string" ? parsed.group : null,
      };
    } catch (e) {
      console.error("recognize failed", e);
      throw new Error("Не получилось распознать. Можно ввести вещи вручную.");
    }
  });

function extractText(res: unknown): string {
  const r = res as { output_text?: string; output?: { content?: { type?: string; text?: string }[] }[] };
  if (typeof r.output_text === "string" && r.output_text) return r.output_text;
  for (const o of r.output ?? []) for (const c of o.content ?? []) if (c.type === "output_text" && c.text) return c.text;
  return "{}";
}
