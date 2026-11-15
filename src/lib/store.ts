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
type ItemIn = { name: string; kind?: string; author?: string | null; needs_review?: boolean };

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await (supabase.rpc as unknown as (f: string, a: unknown) => Promise<{ data: T; error: { message: string } | null }>)(fn, args);
  if (error) throw new Error(error.message.includes("Дом") ? error.message : "Не получилось — проверьте интернет");
  return data;
}

export type HouseholdData = {
  household: { id: string; name: string };
  groups: { id: string; name: string; color: string; icon: string; position: number }[];
  boxes: { id: string; number: number; group_id: string | null; photo_path: string | null; photo_url: string | null; note: string | null; decide_by: string | null; kid_size: string | null; kid_season: string | null; location: string | null; created_at: string }[];
  notes: { id: string; title: string; body: string; updated_at: string }[];
  items: { id: string; box_id: string; name: string; kind: string; author: string | null; needs_review: boolean }[];
};

export async function createHousehold({ data }: { data: { name: string } }) {
  return { token: await rpc<string>("k_create_household", { _name: data.name }) };
}

export async function getHousehold({ data }: { data: Tok }): Promise<HouseholdData> {
  const r = await rpc<Omit<HouseholdData, "boxes"> & { boxes: Omit<HouseholdData["boxes"][number], "photo_url">[] }>("k_get", { _token: data.token });
  hids[data.token] = r.household.id;
  const paths = r.boxes.map((b) => b.photo_path).filter((p): p is string => !!p);
  const urls: Record<string, string> = {};
  if (paths.length) {
    const { data: signed } = await photos(data.token).createSignedUrls(paths, 60 * 60 * 6);
    for (const x of signed ?? []) if (x.path && x.signedUrl) urls[x.path] = x.signedUrl;
  }
  return { ...r, notes: r.notes ?? [], boxes: r.boxes.map((b) => ({ ...b, photo_url: b.photo_path ? urls[b.photo_path] ?? null : null })) };
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

export async function saveBox({ data }: { data: Tok & { id?: string; group_id: string | null; note?: string; decide_by?: string | null; kid_size?: string | null; kid_season?: string | null; location?: string | null; photo?: string | null; items: ItemIn[] } }) {
  let photo_path: string | null = null;
  if (data.photo?.startsWith("data:image/")) {
    const blob = await (await fetch(data.photo)).blob();
    const hid = hids[data.token] ?? (await getHousehold({ data: { token: data.token } })).household.id;
    photo_path = `${hid}/${crypto.randomUUID()}.jpg`;
    const up = await photos(data.token).upload(photo_path, blob, { contentType: "image/jpeg" });
    if (up.error) throw new Error("Фото не сохранилось");
  }
  const id = await rpc<string>("k_save_box", {
    _token: data.token,
    _box: { id: data.id ?? null, group_id: data.group_id, note: data.note ?? null, decide_by: data.decide_by || null, kid_size: data.kid_size || null, kid_season: data.kid_season || null, location: data.location || null, photo_path },
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
