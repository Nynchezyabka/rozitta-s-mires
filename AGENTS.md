<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- No user accounts: each household has a secret token (stored in localStorage, shared via /join/<token> link/QR); the browser calls SECURITY DEFINER database functions (k_*) that check the token (src/lib/store.ts); tables have RLS with no policies. Why: sign-in without email, and the app must run as a static site on the owner's own Supabase. Keep supabase-setup.sql in sync with drizzle/migrations.
- Sticker PDFs render each sticker on a canvas and embed it as an image. Why: jsPDF's built-in fonts lack Cyrillic.
- Static build: `STATIC_BUILD=1 bun run build` → scripts/static-finish.mjs copies `_shell.html` to `dist/client/index.html` (+404.html, _redirects). Why: Layero serves one folder with index.html as SPA fallback.
- AI models per service live in `MODELS` in src/lib/ai-key.ts (first = default, user choice in localStorage). Why: proxies like Claude n Codex reject unknown model names with 400.
- The AI service is chosen explicitly in settings (the key prefix only gives a hint); "Вставить список" (src/lib/paste-list.ts) works with no AI and no server. Why: the app must stay usable without any key, including on someone else's Supabase.
- The Дом page lists rooms (src/lib/rooms.ts) that collect chests by words in their «Где стоит»; shown rooms live in localStorage, old quick notes stay inside rooms. Why: one source of truth for things, no schema change.
- The optional garden has its own `/garden` route, entered from the menu through an illustrated door; coach rewards retain the existing local browser counter. Why: inventory stays uncluttered and existing progress survives without schema changes.
- Garden rewards and permanent planting drifts are defined in `src/lib/garden.ts` with habitat and layer metadata, separate from coach tasks. Why: additions compose into a landscape rather than a scrolling collection and can be tested without rendering.
- Keep in-place group creation in a shared dialog for both chest forms, refreshing the household cache without navigation. Why: creating a category must not discard a chest draft.
- Read seasonal decoration from the device calendar after hydration and refresh on focus and each minute. Why: long-open static pages should change seasons without reload or stored overrides.
- Item tags live in `items.category` (one free-form tag per thing, set by AI, editable); colours are auto from a name hash in src/lib/tags.ts with per-device overrides. Why: tags must cover any topic without a fixed list and need no extra table.
- App version comes from the top entry of `src/lib/changelog.ts`; bump it with package.json and the README badge on notable releases. Why: one source for the in-app «Что нового» and the version label.
- Several houses per device: each is its own household token; the list lives in localStorage (`getHouses`/`useHouses` in src/lib/household.ts), switched from the header; home search also queries the other houses. Why: separate places without any schema change.

- Garden rooms walk in `ROOM_ORDER` (src/lib/garden.ts); each later room has its own localStorage counter (`rozitta-room-<id>`) and opens after `ROOM_UNLOCK` steps in the previous room. Why: pond steps stay derived from the total, so old progress survives.
- Wardrobe items live in the `clothes` table via token-checked k_clothes/k_save_cloth/k_delete_cloth; vocabulary and outfit picker in src/lib/wardrobe.ts; family names are free text with a per-device list. Why: same no-accounts model as chests, optional box link.
