/** Data access straight from the browser via token-checked database functions (works on any static hosting). */
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Storage access scoped to one household: the token header is checked by storage policies. */
const storages: Record<string, ReturnType<typeof createClient>> = {};
function photos(token: string) {
  storages[token] ??= createClient(import.meta.env['VITE_SUPABASE_URL'], import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'], {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: `kh-${token.slice(0, 6)}` },
    global: { headers: { "x-household-token": token } },
  });
  return storages[token].storage.from("photos");
}
const hids: Record<string, string> = {};

type Tok = { token: string };
type ItemIn = { name: string; kind?: string; author?: string | null; needs_review?: boolean; category?: string | null };

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await (supabase.rpc as unknown as (f: string, a: unknown) => Promise<{ data: T; error: { message: string } | null }>)(fn, args);
  if (error) {
    console.error(`[база] ${fn}:`, error);
    const m = error.message ?? "";
    if (/failed to fetch|networkerror|load failed|network request failed|fetch/i.test(m)) throw new Error("Не получилось — проверьте интернет");
    if (m.includes("Дом")) throw new Error(m);
    throw new Error(`Розитта не смогла записать в свиток: ${m.slice(0, 120) || "ошибка базы"}`);
  }
  return data;
}

export type HouseholdData = {
  household: { id: string; name: string };
  groups: { id: string; name: string; color: string; icon: string; position: number }[];
  boxes: { id: string; number: number; group_id: string | null; photo_path: string | null; photo_url: string | null; photo_paths: string[]; photo_urls: string[]; note: string | null; decide_by: string | null; kid_size: string | null; kid_season: string | null; location: string | null; created_at: string }[];
  notes: { id: string; title: string; body: string; updated_at: string }[];
  items: { id: string; box_id: string; name: string; kind: string; author: string | null; needs_review: boolean; category: string | null }[];
};

export async function createHousehold({ data }: { data: { name: string } }) {
  return { token: await rpc<string>("k_create_household", { _name: data.name }) };
}

export async function getHousehold({ data }: { data: Tok }): Promise<HouseholdData> {
  const r = await rpc<Omit<HouseholdData, "boxes"> & { boxes: Omit<HouseholdData["boxes"][number], "photo_url" | "photo_urls">[] }>("k_get", { _token: data.token });
  hids[data.token] = r.household.id;
  for (const b of r.boxes) b.photo_paths = b.photo_paths?.length ? b.photo_paths : b.photo_path ? [b.photo_path] : [];
  const paths = [...new Set(r.boxes.flatMap((b) => b.photo_paths))];
  const urls: Record<string, string> = {};
  if (paths.length) {
    const { data: signed } = await photos(data.token).createSignedUrls(paths, 60 * 60 * 6);
    for (const x of signed ?? []) if (x.path && x.signedUrl) urls[x.path] = x.signedUrl;
  }
  return { ...r, notes: r.notes ?? [], boxes: r.boxes.map((b) => {
    const photo_urls = b.photo_paths.map((p) => urls[p]).filter((u): u is string => !!u);
    return { ...b, photo_url: photo_urls[0] ?? null, photo_urls };
  }) };
}

export async function renameHousehold({ data }: { data: Tok & { name: string } }) {
  await rpc("k_rename", { _token: data.token, _name: data.name });
  return { ok: true };
}

export async function saveGroup({ data }: { data: Tok & { id?: string; name: string; color: string; icon: string; position?: number } }) {
  await rpc("k_save_group", { _token: data.token, _id: data.id ?? null, _name: data.name, _color: data.color, _icon: data.icon, _position: data.position ?? null });
  return { ok: true };
}

export async function deleteGroup({ data }: { data: Tok & { id: string } }) {
  await rpc("k_delete_group", { _token: data.token, _id: data.id });
  return { ok: true };
}

export const MAX_PHOTOS = 5;

async function uploadPhoto(token: string, dataUrl: string) {
  const blob = await (await fetch(dataUrl)).blob();
  const hid = hids[token] ?? (await getHousehold({ data: { token } })).household.id;
  const path = `${hid}/${crypto.randomUUID()}.jpg`;
  const up = await photos(token).upload(path, blob, { contentType: "image/jpeg" });
  if (up.error) throw new Error("Фото не сохранилось");
  return path;
}

/** photos: full ordered list (data: URLs = new, others = existing storage paths), first is the cover. Omit to keep photos as is. */
export async function saveBox({ data }: { data: Tok & { id?: string; number?: number; restore?: boolean; group_id: string | null; note?: string; decide_by?: string | null; kid_size?: string | null; kid_season?: string | null; location?: string | null; photo?: string | null; photos?: string[]; items: ItemIn[] } }) {
  const list = data.photos ?? (data.photo ? [data.photo] : undefined);
  let photo_paths: string[] | undefined;
  if (list) {
    photo_paths = [];
    for (const p of list.slice(0, MAX_PHOTOS)) photo_paths.push(p.startsWith("data:image/") ? await uploadPhoto(data.token, p) : p);
  }
  const id = await rpc<string>("k_save_box", {
    _token: data.token,
    _box: { id: data.id ?? null, number: data.number ?? null, restore: !!data.restore, group_id: data.group_id, note: data.note ?? null, decide_by: data.decide_by || null, kid_size: data.kid_size || null, kid_season: data.kid_season || null, location: data.location || null, ...(photo_paths ? { photo_paths } : {}) },
    _items: data.items,
  });
  return { id };
}

export async function deleteBox({ data }: { data: Tok & { id: string } }) {
  await rpc("k_trash_box", { _token: data.token, _id: data.id, _deleted: true });
  return { ok: true };
}
export async function restoreBox({ data }: { data: Tok & { id: string } }) {
  await rpc("k_trash_box", { _token: data.token, _id: data.id, _deleted: false });
  return { ok: true };
}

export async function saveNote({ data }: { data: Tok & { id?: string; title: string; body: string } }) {
  return { id: await rpc<string>("k_save_note", { _token: data.token, _id: data.id ?? null, _title: data.title, _body: data.body }) };
}
export async function deleteNote({ data }: { data: Tok & { id: string } }) {
  await rpc("k_delete_note", { _token: data.token, _id: data.id });
  return { ok: true };
}

export type Thing = { id: string; space: string; title: string; note: string; watered_at: string | null; fed_at: string | null; created_at: string };
export async function getThings({ data }: { data: Tok }) {
  return (await rpc<Thing[]>("k_things", { _token: data.token })) ?? [];
}
export async function saveThing({ data }: { data: Tok & { id?: string; space: string; title: string; note?: string } }) {
  return { id: await rpc<string>("k_save_thing", { _token: data.token, _id: data.id ?? null, _space: data.space, _title: data.title, _note: data.note ?? "" }) };
}
export async function markThing({ data }: { data: Tok & { id: string; kind: "water" | "feed" } }) {
  await rpc("k_mark_thing", { _token: data.token, _id: data.id, _kind: data.kind });
}
export async function deleteThing({ data }: { data: Tok & { id: string } }) {
  await rpc("k_delete_thing", { _token: data.token, _id: data.id });
}
