import { createServerFn } from "@tanstack/react-start";
import { DEFAULT_GROUPS } from "./defaults";

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

export const createHousehold = createServerFn({ method: "POST" })
  .inputValidator((i: { name: string }) => ({ name: String(i?.name ?? "").slice(0, 60) || "Наш дом" }))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: h, error } = await db.from("households").insert({ name: data.name }).select("id, token").single();
    if (error || !h) throw new Error("Не удалось создать");
    await db.from("groups").insert(DEFAULT_GROUPS.map((g, i) => ({ ...g, position: i, household_id: h.id })));
    return { token: h.token };
  });

export const getHousehold = createServerFn({ method: "POST" })
  .inputValidator(tok)
  .handler(async ({ data }) => {
    const { db, household } = await householdFor(data.token);
    const [groups, boxes, items] = await Promise.all([
      db.from("groups").select("id, name, color, icon, position").eq("household_id", household.id).order("position"),
      db.from("boxes").select("id, number, group_id, photo_path, note, decide_by, kid_size, kid_season, created_at").eq("household_id", household.id).is("deleted_at", null).order("number"),
      db.from("items").select("id, box_id, name, kind, author, needs_review").eq("household_id", household.id).order("created_at"),
    ]);
    const paths = (boxes.data ?? []).map((b) => b.photo_path).filter((p): p is string => !!p);
    const urls: Record<string, string> = {};
    if (paths.length) {
      const { data: signed } = await db.storage.from("photos").createSignedUrls(paths, 60 * 60 * 6);
      for (const s of signed ?? []) if (s.path && s.signedUrl) urls[s.path] = s.signedUrl;
    }
    return {
      household,
      groups: groups.data ?? [],
      boxes: (boxes.data ?? []).map((b) => ({ ...b, photo_url: b.photo_path ? urls[b.photo_path] ?? null : null })),
      items: (items.data ?? []).filter((i) => (boxes.data ?? []).some((b) => b.id === i.box_id)),
    };
  });

export const renameHousehold = createServerFn({ method: "POST" })
  .inputValidator((i: Tok & { name: string }) => tok(i))
  .handler(async ({ data }) => {
    const { db, household } = await householdFor(data.token);
    await db.from("households").update({ name: data.name.slice(0, 60) }).eq("id", household.id);
    return { ok: true };
  });

export const saveGroup = createServerFn({ method: "POST" })
  .inputValidator((i: Tok & { id?: string; name: string; color: string; icon: string; position?: number }) => tok(i))
  .handler(async ({ data }) => {
    const { db, household } = await householdFor(data.token);
    const row = { name: data.name.slice(0, 60), color: data.color, icon: data.icon, household_id: household.id };
    if (data.id) await db.from("groups").update(row).eq("id", data.id).eq("household_id", household.id);
    else await db.from("groups").insert({ ...row, position: data.position ?? 99 });
    return { ok: true };
  });

export const deleteGroup = createServerFn({ method: "POST" })
  .inputValidator((i: Tok & { id: string }) => tok(i))
  .handler(async ({ data }) => {
    const { db, household } = await householdFor(data.token);
    await db.from("groups").delete().eq("id", data.id).eq("household_id", household.id);
    return { ok: true };
  });

type ItemIn = { name: string; kind?: string; author?: string | null; needs_review?: boolean };

export const saveBox = createServerFn({ method: "POST" })
  .inputValidator(
    (i: Tok & { id?: string; group_id: string | null; note?: string; decide_by?: string | null; kid_size?: string | null; kid_season?: string | null; photo?: string | null; items: ItemIn[] }) => tok(i),
  )
  .handler(async ({ data }) => {
    const { db, household } = await householdFor(data.token);
    let photo_path: string | undefined;
    if (data.photo?.startsWith("data:image/")) {
      const b64 = data.photo.split(",")[1] ?? "";
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      photo_path = `${household.id}/${crypto.randomUUID()}.jpg`;
      const up = await db.storage.from("photos").upload(photo_path, bytes, { contentType: "image/jpeg" });
      if (up.error) throw new Error("Фото не сохранилось");
    }
    let boxId = data.id;
    const fields = {
      group_id: data.group_id,
      note: data.note ?? null,
      decide_by: data.decide_by || null,
      kid_size: data.kid_size || null,
      kid_season: data.kid_season || null,
      ...(photo_path ? { photo_path } : {}),
    };
    if (boxId) {
      await db.from("boxes").update(fields).eq("id", boxId).eq("household_id", household.id);
    } else {
      const { data: last } = await db.from("boxes").select("number").eq("household_id", household.id).order("number", { ascending: false }).limit(1);
      const number = (last?.[0]?.number ?? 0) + 1;
      const { data: b, error } = await db.from("boxes").insert({ ...fields, number, household_id: household.id }).select("id").single();
      if (error || !b) throw new Error("Коробка не сохранилась");
      boxId = b.id;
    }
    await db.from("items").delete().eq("box_id", boxId).eq("household_id", household.id);
    const rows = data.items
      .filter((it) => it.name?.trim())
      .map((it) => ({
        box_id: boxId!,
        household_id: household.id,
        name: it.name.trim().slice(0, 200),
        kind: it.kind === "book" ? "book" : "item",
        author: it.author?.trim() || null,
        needs_review: !!it.needs_review,
      }));
    if (rows.length) await db.from("items").insert(rows);
    return { id: boxId! };
  });

export const deleteBox = createServerFn({ method: "POST" })
  .inputValidator((i: Tok & { id: string }) => tok(i))
  .handler(async ({ data }) => {
    const { db, household } = await householdFor(data.token);
    await db.from("boxes").update({ deleted_at: new Date().toISOString() }).eq("id", data.id).eq("household_id", household.id);
    return { ok: true };
  });

export const restoreBox = createServerFn({ method: "POST" })
  .inputValidator((i: Tok & { id: string }) => tok(i))
  .handler(async ({ data }) => {
    const { db, household } = await householdFor(data.token);
    await db.from("boxes").update({ deleted_at: null }).eq("id", data.id).eq("household_id", household.id);
    return { ok: true };
  });

export type Recognized = {
  items: { name: string; author?: string | null; needs_review?: boolean }[];
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
        : `На фото открытая коробка с вещами при переезде. Перечисли вещи коротко по-русски (name), объединяя однотипные ("Полотенца, 4 шт"). Не больше 25 пунктов. needs_review: true, если вещь видна плохо.`;
    const prompt = `${task}
Предложи одну группу из списка: ${names}. Если не подходит ни одна — "Решить позже".
Верни только JSON: {"items":[{"name":"...","author":null,"needs_review":false}],"group":"..."}`;
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
